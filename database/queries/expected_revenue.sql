-- One contribution per registered ownership / tax-year intersection, even if
-- no case has been opened. Touching half-open intervals have no miles in common.
WITH report(as_of) AS (VALUES ('2029-04-04T00:00:00Z')),
expected_segments AS (
  SELECT o.ownership_id, y.tax_year_id, y.label AS billing_year, t.code AS vehicle_type, o.vehicle_id,
         MAX(o.valid_from_at, y.starts_at) AS period_start_at,
         MIN(COALESCE(o.valid_to_at, y.ends_at), y.ends_at) AS period_end_at
  FROM ownership_periods o
  JOIN tax_years y ON o.valid_from_at < y.ends_at AND (o.valid_to_at IS NULL OR y.starts_at < o.valid_to_at)
  JOIN vehicles v USING (vehicle_id)
  JOIN vehicle_types t USING (vehicle_type_id)
),
segments AS (
  SELECT s.billing_year, s.vehicle_type, s.vehicle_id,
         COALESCE(e.odometer_miles - b.odometer_miles, d.estimated_miles) AS miles,
         COALESCE(a.final_tax_pence, d.advance_due_pence) AS tax_pence
  FROM expected_segments s CROSS JOIN report
  LEFT JOIN tax_cases c ON c.ownership_id = s.ownership_id AND c.tax_year_id = s.tax_year_id
       AND c.created_at <= as_of
  LEFT JOIN tax_assessments a ON a.case_id = c.case_id
       AND a.status = 'ISSUED' AND a.assessed_at <= as_of
  LEFT JOIN odometer_readings b ON b.reading_id = a.opening_reading_id
  LEFT JOIN odometer_readings e ON e.reading_id = a.closing_reading_id
  LEFT JOIN declarations d ON d.case_id = c.case_id
       AND d.status = 'ACCEPTED' AND d.submitted_at <= as_of
       AND d.coverage_start_at = s.period_start_at AND d.coverage_end_at = s.period_end_at
       AND as_of < s.period_end_at
  WHERE s.period_start_at <= as_of
)
SELECT billing_year, vehicle_type, COUNT(DISTINCT vehicle_id) AS vehicles,
       CASE WHEN COUNT(miles) = COUNT(*) THEN SUM(miles) END AS miles,
       CASE WHEN COUNT(tax_pence) = COUNT(*) THEN SUM(tax_pence) / 100.0 END AS expected_final_gbp,
       COUNT(*) - COUNT(tax_pence) AS incomplete_segments
FROM segments
GROUP BY billing_year, vehicle_type
ORDER BY billing_year, vehicle_type;
