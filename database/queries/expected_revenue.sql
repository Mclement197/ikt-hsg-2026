-- One contribution per case in this reporting snapshot. An issued decision
-- takes priority; only an open case with a matching accepted estimate can use it.
WITH report(as_of) AS (VALUES ('2029-04-04T00:00:00Z')),
segments AS (
  SELECT c.billing_year, c.vehicle_type, c.vehicle_id,
         COALESCE(e.odometer_miles - b.odometer_miles, d.estimated_miles) AS miles,
         COALESCE(a.final_tax_pence, d.advance_due_pence) AS tax_pence
  FROM case_periods c CROSS JOIN report
  LEFT JOIN tax_assessments a ON a.case_id = c.case_id
       AND a.status = 'ISSUED' AND a.assessed_at <= as_of
  LEFT JOIN odometer_readings b ON b.reading_id = a.opening_reading_id
  LEFT JOIN odometer_readings e ON e.reading_id = a.closing_reading_id
  LEFT JOIN declarations d ON d.case_id = c.case_id
       AND d.status = 'ACCEPTED' AND d.submitted_at <= as_of
       AND d.coverage_start_at = c.period_start_at AND d.coverage_end_at = c.period_end_at
       AND as_of < c.period_end_at
  WHERE c.created_at <= as_of AND c.period_start_at <= as_of
)
SELECT billing_year, vehicle_type, COUNT(DISTINCT vehicle_id) AS vehicles,
       CASE WHEN COUNT(miles) = COUNT(*) THEN SUM(miles) END AS miles,
       CASE WHEN COUNT(tax_pence) = COUNT(*) THEN SUM(tax_pence) / 100.0 END AS expected_final_gbp,
       COUNT(*) - COUNT(tax_pence) AS incomplete_segments
FROM segments
GROUP BY billing_year, vehicle_type
ORDER BY billing_year, vehicle_type;
