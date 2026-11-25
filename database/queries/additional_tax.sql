-- Compare the current issued decision with the FIRST accepted advance demand.
-- A later revision does not rewrite that historical comparison. Cash is separate.
WITH adjustments AS (
  SELECT y.label AS billing_year, a.final_tax_pence - (
    SELECT d.advance_due_pence FROM declarations d
    WHERE d.case_id = a.case_id AND d.status IN ('ACCEPTED', 'SUPERSEDED')
    ORDER BY d.revision_no LIMIT 1
  ) AS delta
  FROM tax_assessments a
  JOIN tax_cases c USING (case_id)
  JOIN tax_years y USING (tax_year_id)
  WHERE a.status = 'ISSUED'
)
SELECT billing_year, COUNT(*) AS assessed_cases,
       COUNT(CASE WHEN delta > 0 THEN 1 END) AS additional_payment_cases,
       COUNT(CASE WHEN delta < 0 THEN 1 END) AS refund_cases,
       CASE WHEN COUNT(delta) = COUNT(*) THEN SUM(MAX(delta, 0)) / 100.0 END AS additional_tax_gbp,
       CASE WHEN COUNT(delta) = COUNT(*) THEN SUM(MAX(-delta, 0)) / 100.0 END AS refunds_gbp,
       COUNT(*) - COUNT(delta) AS missing_advance_cases
FROM adjustments
GROUP BY billing_year
ORDER BY billing_year;
