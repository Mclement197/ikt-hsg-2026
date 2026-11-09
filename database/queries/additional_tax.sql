SELECT
    strftime('%Y', d.period_start) AS period_start_year,
    COUNT(*) AS assessed_declarations,

    SUM(CASE WHEN a.final_tax_pence > d.advance_due_pence
        THEN 1 ELSE 0 END) AS additional_payment_cases,

    SUM(CASE WHEN a.final_tax_pence < d.advance_due_pence
        THEN 1 ELSE 0 END) AS refund_cases,

    ROUND(SUM(CASE WHEN a.final_tax_pence > d.advance_due_pence
        THEN a.final_tax_pence - d.advance_due_pence
        ELSE 0 END) / 100.0, 2) AS additional_tax_gbp,

    ROUND(SUM(CASE WHEN a.final_tax_pence < d.advance_due_pence
        THEN d.advance_due_pence - a.final_tax_pence
        ELSE 0 END) / 100.0, 2) AS refunds_gbp

FROM declarations AS d
JOIN tax_assessments AS a ON d.declaration_id = a.declaration_id
GROUP BY strftime('%Y', d.period_start)
ORDER BY period_start_year;