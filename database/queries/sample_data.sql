-- Fictional data: five MOT verification and final settlement cases.
-- Run once after creating the six empty tables.
-- Money is stored in pence. period_end is exclusive.
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

INSERT INTO vehicle_owners (owner_id, full_name, postal_address) VALUES
(1, 'Alice Example', '1 Example Road, London'),
(2, 'Ben Example', '2 Example Road, Manchester'),
(3, 'Clara Example', '3 Example Road, Bristol'),
(4, 'Daniel Example', '4 Example Road, Leeds'),
(5, 'Emma Example', '5 Example Road, Birmingham');

INSERT INTO vehicles
(vehicle_id, owner_id, registration_number, vehicle_type) VALUES
(1, 1, 'DEMO001', 'BEV'),
(2, 2, 'DEMO002', 'BEV'),
(3, 3, 'DEMO003', 'BEV'),
(4, 4, 'DEMO004', 'PHEV'),
(5, 5, 'DEMO005', 'PHEV');

INSERT INTO declarations
(declaration_id, vehicle_id, period_start, period_end,
 estimated_miles, advance_due_pence, submitted_at) VALUES
(1, 1, '2028-04-01', '2029-04-01', 10000, 30000, '2028-04-01T09:00:00Z'),
(2, 2, '2028-04-01', '2029-04-01', 10000, 30000, '2028-04-01T09:00:00Z'),
(3, 3, '2028-04-01', '2029-04-01', 10000, 30000, '2028-04-01T09:00:00Z'),
(4, 4, '2028-04-01', '2029-04-01',  8000, 12000, '2028-04-01T09:00:00Z'),
(5, 5, '2028-04-01', '2029-04-01', 10000, 15000, '2028-04-01T09:00:00Z');

INSERT INTO payments
(payment_id, declaration_id, payment_type, amount_pence, paid_at) VALUES
(1, 1, 'ADVANCE', 30000, '2028-04-01T10:00:00Z'),
(2, 2, 'ADVANCE', 30000, '2028-04-01T10:00:00Z'),
(3, 3, 'ADVANCE', 30000, '2028-04-01T10:00:00Z'),
(4, 4, 'ADVANCE', 12000, '2028-04-01T10:00:00Z'),
(5, 5, 'ADVANCE', 15000, '2028-04-01T10:00:00Z');

-- Each vehicle has an opening and a closing odometer reading.
INSERT INTO mot_inspections
(inspection_id, vehicle_id, inspection_date, odometer_miles, mot_centre_ref) VALUES
(1,  1, '2028-04-01', 20000, 'DEMO-MOT-01'),
(2,  1, '2029-04-01', 32000, 'DEMO-MOT-01'),
(3,  2, '2028-04-01', 40000, 'DEMO-MOT-02'),
(4,  2, '2029-04-01', 48000, 'DEMO-MOT-02'),
(5,  3, '2028-04-01', 15000, 'DEMO-MOT-03'),
(6,  3, '2029-04-01', 25000, 'DEMO-MOT-03'),
(7,  4, '2028-04-01', 30000, 'DEMO-MOT-04'),
(8,  4, '2029-04-01', 40000, 'DEMO-MOT-04'),
(9,  5, '2028-04-01', 10000, 'DEMO-MOT-05'),
(10, 5, '2029-04-01', 22000, 'DEMO-MOT-05');

INSERT INTO tax_assessments
(assessment_id, declaration_id, opening_inspection_id,
 closing_inspection_id, assessed_at, final_tax_pence) VALUES
(1, 1, 1,  2, '2029-04-02T09:00:00Z', 36000),
(2, 2, 3,  4, '2029-04-02T09:00:00Z', 24000),
(3, 3, 5,  6, '2029-04-02T09:00:00Z', 30000),
(4, 4, 7,  8, '2029-04-02T09:00:00Z', 15000),
(5, 5, 9, 10, '2029-04-02T09:00:00Z', 18000);

-- Case 1 pays GBP 60 extra; case 2 receives GBP 60 back.
-- Case 3 needs no adjustment; case 4 pays GBP 30 extra.
-- Case 5 still owes GBP 30, so no additional payment is recorded.
-- Refund amounts are positive; payment_type identifies the outflow.
INSERT INTO payments
(payment_id, declaration_id, payment_type, amount_pence, paid_at) VALUES
(6, 1, 'ADDITIONAL', 6000, '2029-04-03T10:00:00Z'),
(7, 2, 'REFUND',     6000, '2029-04-03T10:00:00Z'),
(8, 4, 'ADDITIONAL', 3000, '2029-04-03T10:00:00Z');

COMMIT;

