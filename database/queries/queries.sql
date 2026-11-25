-- Bank reconciliation: one row per posted transaction, even if not allocated.
-- Amounts here are magnitudes; direction distinguishes receipts from refunds.
SELECT p.payment_id, p.owner_id, p.external_reference, p.direction, p.amount_pence,
       COALESCE(SUM(a.allocated_pence), 0) AS allocated_pence,
       p.amount_pence - COALESCE(SUM(a.allocated_pence), 0) AS unallocated_pence
FROM payments p
LEFT JOIN payment_allocations a USING (payment_id)
GROUP BY p.payment_id
ORDER BY p.payment_id;
