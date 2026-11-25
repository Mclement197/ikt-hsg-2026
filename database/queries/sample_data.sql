-- Five Case A settlements. All amounts are pence, intervals end exclusively.
-- Load in order, once on empty tables, inside load_db.py's transaction.
INSERT INTO vehicle_owners (owner_id, full_name, postal_address) VALUES
(1, 'Alice Example', '1 Example Road, London'),
(2, 'Ben Example', '2 Example Road, Manchester'),
(3, 'Clara Example', '3 Example Road, Bristol'),
(4, 'Daniel Example', '4 Example Road, Leeds'),
(5, 'Emma Example', '5 Example Road, Birmingham');

INSERT INTO vehicle_types (vehicle_type_id, code, description) VALUES
(1, 'BEV', 'Battery electric vehicle'), (2, 'PHEV', 'Plug-in hybrid electric vehicle');
INSERT INTO vehicles (vehicle_id, registration_number, vehicle_type_id) VALUES
(1, 'DEMO001', 1), (2, 'DEMO002', 1), (3, 'DEMO003', 2), (4, 'DEMO004', 2);
INSERT INTO tax_years (tax_year_id, label, starts_at, ends_at) VALUES
(1, '2028/29', '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z');
INSERT INTO tax_rates (tax_rate_id, vehicle_type_id, tax_year_id, half_pence_per_mile) VALUES
(1, 1, 1, 6), (2, 2, 1, 3);
INSERT INTO mot_centres (mot_centre_id, centre_ref, name, postal_address) VALUES
(1, 'CENTRE-01', 'North Verification Centre', '1 Test Lane, London'),
(2, 'CENTRE-02', 'West Verification Centre', '2 Test Lane, Bristol'),
(3, 'CENTRE-03', 'East Verification Centre', '3 Test Lane, Leeds'),
(4, 'CENTRE-04', 'South Verification Centre', '4 Test Lane, Birmingham');

-- April opening: ownership can span several tax years. Only its intersection
-- with 2028/29 belongs to each case. NULL means no end has been recorded.
INSERT INTO ownership_periods (ownership_id, vehicle_id, owner_id, valid_from_at, valid_to_at) VALUES
(1, 1, 1, '2027-06-01T00:00:00Z', NULL),
(3, 2, 3, '2027-08-01T00:00:00Z', NULL),
(4, 3, 4, '2028-01-01T00:00:00Z', NULL),
(5, 4, 5, '2028-03-01T00:00:00Z', NULL);
INSERT INTO tax_cases (case_id, ownership_id, tax_year_id, created_at) VALUES
(1, 1, 1, '2028-04-01T08:00:00Z'), (3, 3, 1, '2028-04-01T08:00:00Z'),
(4, 4, 1, '2028-04-01T08:00:00Z'), (5, 5, 1, '2028-04-01T08:00:00Z');
INSERT INTO declarations
(declaration_id, case_id, revision_no, coverage_start_at, coverage_end_at, estimated_miles,
 tax_rate_id, advance_due_pence, submitted_at, status) VALUES
(1, 1, 1, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 10000, 1, 30000, '2028-04-01T09:00:00Z', 'ACCEPTED'),
(3, 3, 1, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 10000, 1, 30000, '2028-04-01T09:00:00Z', 'ACCEPTED'),
(4, 4, 1, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z',  8000, 2, 12000, '2028-04-01T09:00:00Z', 'ACCEPTED'),
(5, 5, 1, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 10000, 2, 15000, '2028-04-01T09:00:00Z', 'ACCEPTED');
INSERT INTO odometer_readings
(reading_id, vehicle_id, mot_centre_id, observed_at, odometer_miles, reading_kind,
 verification_status, evidence_ref, recorded_at, verified_at) VALUES
(1, 1, 1, '2028-04-01T00:00:00Z', 20000, 'MOT', 'ACCEPTED', 'MOT-101', '2028-04-01T00:05:00Z', '2028-04-01T00:10:00Z'),
(4, 2, 2, '2028-04-01T00:00:00Z', 15000, 'MOT', 'ACCEPTED', 'MOT-201', '2028-04-01T00:05:00Z', '2028-04-01T00:10:00Z'),
(6, 3, 3, '2028-04-01T00:00:00Z', 30000, 'MOT', 'ACCEPTED', 'MOT-301', '2028-04-01T00:05:00Z', '2028-04-01T00:10:00Z'),
(8, 4, 4, '2028-04-01T00:00:00Z', 10000, 'MOT', 'ACCEPTED', 'MOT-401', '2028-04-01T00:05:00Z', '2028-04-01T00:10:00Z');

-- Real bank movements and their allocations, not advance demands.
INSERT INTO payments (payment_id, owner_id, direction, amount_pence, paid_at, source_system, external_reference) VALUES
(1, 1, 'IN', 30000, '2028-04-01T10:00:00Z', 'DemoBank', 'TX-001'),
(3, 3, 'IN', 30000, '2028-04-01T10:00:00Z', 'DemoBank', 'TX-003'),
(4, 4, 'IN', 12000, '2028-04-01T10:00:00Z', 'DemoBank', 'TX-004'),
(5, 5, 'IN', 15000, '2028-04-01T10:00:00Z', 'DemoBank', 'TX-005');
INSERT INTO payment_allocations (allocation_id, payment_id, case_id, allocated_pence, allocation_reference) VALUES
(1, 1, 1, 30000, 'ALLOC-001'), (3, 3, 3, 30000, 'ALLOC-003'),
(4, 4, 4, 12000, 'ALLOC-004'), (5, 5, 5, 15000, 'ALLOC-005');

-- January handover: keep Alice's original declaration; the shared reading
-- closes her case and opens Ben's, whether or not her refund has been paid.
INSERT INTO odometer_readings
(reading_id, vehicle_id, mot_centre_id, observed_at, odometer_miles, reading_kind,
 verification_status, evidence_ref, recorded_at, verified_at) VALUES
(2, 1, 1, '2029-01-01T00:00:00Z', 26000, 'HANDOVER', 'ACCEPTED', 'SALE-101', '2029-01-01T00:05:00Z', '2029-01-01T00:10:00Z');
UPDATE ownership_periods SET valid_to_at = '2029-01-01T00:00:00Z' WHERE ownership_id = 1;
INSERT INTO ownership_periods (ownership_id, vehicle_id, owner_id, valid_from_at, valid_to_at)
VALUES (2, 1, 2, '2029-01-01T00:00:00Z', NULL);
INSERT INTO tax_cases (case_id, ownership_id, tax_year_id, created_at) VALUES (2, 2, 1, '2029-01-01T08:00:00Z');
INSERT INTO tax_assessments
(assessment_id, case_id, revision_no, opening_reading_id, closing_reading_id, tax_rate_id,
 period_start_at, period_end_at, final_tax_pence, assessed_at, status) VALUES
(1, 1, 1, 1, 2, 1, '2028-04-01T00:00:00Z', '2029-01-01T00:00:00Z', 18000, '2029-01-01T09:00:00Z', 'ISSUED');
INSERT INTO declarations
(declaration_id, case_id, revision_no, coverage_start_at, coverage_end_at, estimated_miles,
 tax_rate_id, advance_due_pence, submitted_at, status) VALUES
(2, 2, 1, '2029-01-01T00:00:00Z', '2029-04-01T00:00:00Z', 5000, 1, 15000, '2029-01-01T10:00:00Z', 'ACCEPTED');
INSERT INTO payments (payment_id, owner_id, direction, amount_pence, paid_at, source_system, external_reference)
VALUES (2, 2, 'IN', 15000, '2029-01-01T11:00:00Z', 'DemoBank', 'TX-002');
INSERT INTO payment_allocations (allocation_id, payment_id, case_id, allocated_pence, allocation_reference)
VALUES (2, 2, 2, 15000, 'ALLOC-002');

-- Refund paid after registration changed.
INSERT INTO payments (payment_id, owner_id, direction, amount_pence, paid_at, source_system, external_reference)
VALUES (6, 1, 'OUT', 12000, '2029-01-02T10:00:00Z', 'DemoBank', 'TX-006');
INSERT INTO payment_allocations (allocation_id, payment_id, case_id, allocated_pence, allocation_reference)
VALUES (6, 6, 1, 12000, 'ALLOC-006');

-- Annual closing
INSERT INTO odometer_readings
(reading_id, vehicle_id, mot_centre_id, observed_at, odometer_miles, reading_kind,
 verification_status, evidence_ref, recorded_at, verified_at) VALUES
(3, 1, 1, '2029-04-01T00:00:00Z', 32000, 'PERIOD_BOUNDARY', 'ACCEPTED', 'END-101', '2029-04-01T00:05:00Z', '2029-04-01T00:10:00Z'),
(5, 2, 2, '2029-04-01T00:00:00Z', 25000, 'PERIOD_BOUNDARY', 'ACCEPTED', 'END-201', '2029-04-01T00:05:00Z', '2029-04-01T00:10:00Z'),
(7, 3, 3, '2029-04-01T00:00:00Z', 40000, 'PERIOD_BOUNDARY', 'ACCEPTED', 'END-301', '2029-04-01T00:05:00Z', '2029-04-01T00:10:00Z'),
(9, 4, 4, '2029-04-01T00:00:00Z', 22000, 'PERIOD_BOUNDARY', 'ACCEPTED', 'END-401', '2029-04-01T00:05:00Z', '2029-04-01T00:10:00Z');
INSERT INTO tax_assessments
(assessment_id, case_id, revision_no, opening_reading_id, closing_reading_id, tax_rate_id,
 period_start_at, period_end_at, final_tax_pence, assessed_at, status) VALUES
(2, 2, 1, 2, 3, 1, '2029-01-01T00:00:00Z', '2029-04-01T00:00:00Z', 18000, '2029-04-02T09:00:00Z', 'ISSUED'),
(3, 3, 1, 4, 5, 1, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 30000, '2029-04-02T09:00:00Z', 'ISSUED'),
(4, 4, 1, 6, 7, 2, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 15000, '2029-04-02T09:00:00Z', 'ISSUED'),
(5, 5, 1, 8, 9, 2, '2028-04-01T00:00:00Z', '2029-04-01T00:00:00Z', 18000, '2029-04-02T09:00:00Z', 'ISSUED');

-- Ben and Daniel paid their extra £30. Emma's £30 is still outstanding.
INSERT INTO payments (payment_id, owner_id, direction, amount_pence, paid_at, source_system, external_reference) VALUES
(7, 2, 'IN', 3000, '2029-04-03T10:00:00Z', 'DemoBank', 'TX-007'),
(8, 4, 'IN', 3000, '2029-04-03T10:00:00Z', 'DemoBank', 'TX-008');
INSERT INTO payment_allocations (allocation_id, payment_id, case_id, allocated_pence, allocation_reference) VALUES
(7, 7, 2, 3000, 'ALLOC-007'), (8, 8, 4, 3000, 'ALLOC-008');
