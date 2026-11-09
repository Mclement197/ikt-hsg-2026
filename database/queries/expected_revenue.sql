SELECT
    strftime('%Y', d.period_start) AS period_start_year,
    v.vehicle_type,
    COUNT(DISTINCT v.vehicle_id) AS number_of_vehicles,
    SUM(d.estimated_miles) AS total_declared_miles,
    ROUND(SUM(d.advance_due_pence) / 100.0, 2) AS expected_revenue_gbp
FROM declarations AS d
JOIN vehicles AS v ON d.vehicle_id = v.vehicle_id
GROUP BY strftime('%Y', d.period_start), v.vehicle_type
ORDER BY period_start_year, v.vehicle_type;