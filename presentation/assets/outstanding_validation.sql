-- Cash by case, not by declaration revision. First aggregate allocations so
-- split payments and instalments cannot duplicate the liability or bank amount.
WITH net_payments AS (
  SELECT a.case_id,
         SUM(CASE WHEN p.direction = 'OUT' THEN -a.allocated_pence
                  ELSE a.allocated_pence END) AS net_pence
  FROM payment_allocations a JOIN payments p USING (payment_id)
  GROUP BY a.case_id
)
SELECT a.case_id, a.final_tax_pence / 100.0 AS final_gbp,
       COALESCE(p.net_pence, 0) / 100.0 AS net_cash_gbp,
       (a.final_tax_pence - COALESCE(p.net_pence, 0)) / 100.0 AS remaining_gbp
FROM tax_assessments a
LEFT JOIN net_payments p USING (case_id)
WHERE a.status = 'ISSUED'
ORDER BY a.case_id;
