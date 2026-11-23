-- Supplementary validation, not one of the two required analyses.
-- Aggregate cash first: joining raw payments would repeat liabilities.
WITH net_payments AS (
  SELECT declaration_id,
    SUM(CASE WHEN payment_type = 'REFUND'
             THEN -amount_pence ELSE amount_pence END) AS net_pence
  FROM payments
  GROUP BY declaration_id
)
SELECT a.declaration_id,
  a.final_tax_pence / 100.0 AS final_gbp,
  COALESCE(p.net_pence, 0) / 100.0 AS net_cash_gbp,
  (a.final_tax_pence - COALESCE(p.net_pence, 0)) / 100.0
    AS remaining_gbp
FROM tax_assessments AS a
LEFT JOIN net_payments AS p ON p.declaration_id = a.declaration_id
ORDER BY a.declaration_id;
