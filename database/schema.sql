-- Case A. All *_at values are UTC: YYYY-MM-DDTHH:MM:SSZ.
-- Normalising and comparing with IS also rejects impossible dates and NULL parse results.
CREATE TABLE vehicle_owners (
  owner_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  postal_address TEXT NOT NULL
) STRICT;

CREATE TABLE vehicle_types (
  vehicle_type_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('BEV', 'PHEV')),
  description TEXT NOT NULL
) STRICT;

CREATE TABLE vehicles (
  vehicle_id INTEGER PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(vehicle_type_id)
) STRICT;

CREATE TABLE ownership_periods (
  ownership_id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
  owner_id INTEGER NOT NULL REFERENCES vehicle_owners(owner_id),
  valid_from_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', valid_from_at, '+0 seconds') IS valid_from_at),
  valid_to_at TEXT CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', valid_to_at, '+0 seconds') IS valid_to_at),
  CHECK (valid_to_at IS NULL OR valid_from_at < valid_to_at)
) STRICT;

CREATE TABLE tax_years (
  tax_year_id INTEGER PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', starts_at, '+0 seconds') IS starts_at),
  ends_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', ends_at, '+0 seconds') IS ends_at),
  CHECK (starts_at < ends_at)
) STRICT;

CREATE TABLE tax_rates (
  tax_rate_id INTEGER PRIMARY KEY,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(vehicle_type_id),
  tax_year_id INTEGER NOT NULL REFERENCES tax_years(tax_year_id),
  half_pence_per_mile INTEGER NOT NULL CHECK (half_pence_per_mile > 0),
  UNIQUE (vehicle_type_id, tax_year_id)
) STRICT;

CREATE TABLE tax_cases (
  case_id INTEGER PRIMARY KEY,
  ownership_id INTEGER NOT NULL REFERENCES ownership_periods(ownership_id),
  tax_year_id INTEGER NOT NULL REFERENCES tax_years(tax_year_id),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '+0 seconds') IS created_at),
  UNIQUE (ownership_id, tax_year_id)
) STRICT;

CREATE TABLE declarations (
  declaration_id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES tax_cases(case_id),
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  coverage_start_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', coverage_start_at, '+0 seconds') IS coverage_start_at),
  coverage_end_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', coverage_end_at, '+0 seconds') IS coverage_end_at),
  estimated_miles INTEGER NOT NULL CHECK (estimated_miles >= 0),
  tax_rate_id INTEGER NOT NULL REFERENCES tax_rates(tax_rate_id),
  advance_due_pence INTEGER NOT NULL CHECK (advance_due_pence >= 0),
  submitted_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', submitted_at, '+0 seconds') IS submitted_at),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACCEPTED', 'REJECTED', 'SUPERSEDED')),
  supersedes_declaration_id INTEGER REFERENCES declarations(declaration_id),
  CHECK (coverage_start_at < coverage_end_at),
  UNIQUE (case_id, revision_no)
) STRICT;
CREATE UNIQUE INDEX current_declaration ON declarations(case_id) WHERE status = 'ACCEPTED';

CREATE TABLE mot_centres (
  mot_centre_id INTEGER PRIMARY KEY,
  centre_ref TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  postal_address TEXT NOT NULL
) STRICT;

CREATE TABLE odometer_readings (
  reading_id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
  mot_centre_id INTEGER REFERENCES mot_centres(mot_centre_id),
  observed_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', observed_at, '+0 seconds') IS observed_at),
  odometer_miles INTEGER NOT NULL CHECK (odometer_miles >= 0),
  reading_kind TEXT NOT NULL CHECK (reading_kind IN ('MOT', 'HANDOVER', 'PERIOD_BOUNDARY')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED')),
  evidence_ref TEXT NOT NULL CHECK (trim(evidence_ref) <> ''),
  recorded_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', recorded_at, '+0 seconds') IS recorded_at),
  verified_at TEXT CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', verified_at, '+0 seconds') IS verified_at),
  supersedes_reading_id INTEGER REFERENCES odometer_readings(reading_id),
  CHECK (observed_at <= recorded_at AND (verified_at IS NULL OR observed_at <= verified_at)),
  CHECK (verification_status NOT IN ('ACCEPTED', 'SUPERSEDED') OR (mot_centre_id IS NOT NULL AND verified_at IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX current_reading ON odometer_readings(vehicle_id, observed_at)
WHERE verification_status = 'ACCEPTED';

CREATE TABLE tax_assessments (
  assessment_id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES tax_cases(case_id),
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  opening_reading_id INTEGER NOT NULL REFERENCES odometer_readings(reading_id),
  closing_reading_id INTEGER NOT NULL REFERENCES odometer_readings(reading_id),
  tax_rate_id INTEGER NOT NULL REFERENCES tax_rates(tax_rate_id),
  period_start_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', period_start_at, '+0 seconds') IS period_start_at),
  period_end_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', period_end_at, '+0 seconds') IS period_end_at),
  final_tax_pence INTEGER NOT NULL CHECK (final_tax_pence >= 0),
  assessed_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', assessed_at, '+0 seconds') IS assessed_at),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'SUPERSEDED')),
  supersedes_assessment_id INTEGER REFERENCES tax_assessments(assessment_id),
  CHECK (period_start_at < period_end_at AND opening_reading_id <> closing_reading_id),
  UNIQUE (case_id, revision_no)
) STRICT;
CREATE UNIQUE INDEX current_assessment ON tax_assessments(case_id) WHERE status = 'ISSUED';

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES vehicle_owners(owner_id),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  paid_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', paid_at, '+0 seconds') IS paid_at),
  source_system TEXT NOT NULL CHECK (trim(source_system) <> ''),
  external_reference TEXT NOT NULL CHECK (trim(external_reference) <> ''),
  UNIQUE (source_system, external_reference)
) STRICT;

CREATE TABLE payment_allocations (
  allocation_id INTEGER PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(payment_id),
  case_id INTEGER NOT NULL REFERENCES tax_cases(case_id),
  allocated_pence INTEGER NOT NULL CHECK (allocated_pence > 0),
  allocation_reference TEXT NOT NULL UNIQUE CHECK (trim(allocation_reference) <> '')
) STRICT;

-- One row per case. A later sale changes this intersection, not the original estimate.
CREATE VIEW case_periods AS
SELECT c.case_id, c.created_at, y.tax_year_id, y.label AS billing_year,
       o.ownership_id, o.owner_id, v.vehicle_id, t.vehicle_type_id, t.code AS vehicle_type,
       MAX(o.valid_from_at, y.starts_at) AS period_start_at,
       MIN(COALESCE(o.valid_to_at, y.ends_at), y.ends_at) AS period_end_at
FROM tax_cases c
JOIN tax_years y USING (tax_year_id)
JOIN ownership_periods o USING (ownership_id)
JOIN vehicles v USING (vehicle_id)
JOIN vehicle_types t USING (vehicle_type_id);

-- Half-open intervals: touching endpoints are allowed.
CREATE TRIGGER ownership_insert BEFORE INSERT ON ownership_periods
WHEN EXISTS (SELECT 1 FROM ownership_periods WHERE vehicle_id = NEW.vehicle_id
  AND (NEW.valid_to_at IS NULL OR valid_from_at < NEW.valid_to_at)
  AND (valid_to_at IS NULL OR NEW.valid_from_at < valid_to_at))
BEGIN SELECT RAISE(ABORT, 'overlapping ownership periods'); END;

CREATE TRIGGER ownership_update BEFORE UPDATE ON ownership_periods
WHEN EXISTS (SELECT 1 FROM ownership_periods WHERE vehicle_id = NEW.vehicle_id AND ownership_id <> OLD.ownership_id
  AND (NEW.valid_to_at IS NULL OR valid_from_at < NEW.valid_to_at)
  AND (valid_to_at IS NULL OR NEW.valid_from_at < valid_to_at))
BEGIN SELECT RAISE(ABORT, 'overlapping ownership periods'); END;

CREATE TRIGGER year_insert BEFORE INSERT ON tax_years
WHEN EXISTS (SELECT 1 FROM tax_years WHERE starts_at < NEW.ends_at AND NEW.starts_at < ends_at)
BEGIN SELECT RAISE(ABORT, 'overlapping tax years'); END;

CREATE TRIGGER year_update BEFORE UPDATE OF starts_at, ends_at ON tax_years
WHEN EXISTS (SELECT 1 FROM tax_cases WHERE tax_year_id = OLD.tax_year_id)
  OR EXISTS (SELECT 1 FROM tax_years WHERE tax_year_id <> OLD.tax_year_id
             AND starts_at < NEW.ends_at AND NEW.starts_at < ends_at)
BEGIN SELECT RAISE(ABORT, 'tax year already in use or overlapping'); END;

CREATE TRIGGER case_insert AFTER INSERT ON tax_cases
WHEN EXISTS (SELECT 1 FROM case_periods WHERE case_id = NEW.case_id AND period_start_at >= period_end_at)
BEGIN SELECT RAISE(ABORT, 'ownership does not intersect tax year'); END;

CREATE TRIGGER case_identity BEFORE UPDATE ON tax_cases
BEGIN SELECT RAISE(ABORT, 'tax case identity is fixed'); END;

CREATE TRIGGER owner_identity BEFORE UPDATE OF owner_id, vehicle_id ON ownership_periods
WHEN EXISTS (SELECT 1 FROM tax_cases WHERE ownership_id = OLD.ownership_id)
BEGIN SELECT RAISE(ABORT, 'ownership identity already used by a case'); END;

CREATE TRIGGER case_boundaries AFTER UPDATE OF valid_from_at, valid_to_at ON ownership_periods
WHEN EXISTS (SELECT 1 FROM case_periods c LEFT JOIN tax_assessments a
             ON a.case_id = c.case_id AND a.status IN ('ISSUED', 'SUPERSEDED')
             WHERE c.ownership_id = NEW.ownership_id AND (c.period_start_at >= c.period_end_at
               OR a.period_start_at <> c.period_start_at OR a.period_end_at <> c.period_end_at))
BEGIN SELECT RAISE(ABORT, 'empty case or changed issued period'); END;

CREATE TRIGGER vehicle_class BEFORE UPDATE OF vehicle_type_id ON vehicles
WHEN EXISTS (SELECT 1 FROM case_periods WHERE vehicle_id = OLD.vehicle_id)
BEGIN SELECT RAISE(ABORT, 'vehicle class already used by a case'); END;
CREATE TRIGGER used_type BEFORE UPDATE OF code ON vehicle_types
WHEN EXISTS (SELECT 1 FROM vehicles WHERE vehicle_type_id = OLD.vehicle_type_id)
  OR EXISTS (SELECT 1 FROM tax_rates WHERE vehicle_type_id = OLD.vehicle_type_id)
BEGIN SELECT RAISE(ABORT, 'vehicle type already used'); END;

CREATE TRIGGER used_rate BEFORE UPDATE ON tax_rates
WHEN EXISTS (SELECT 1 FROM declarations WHERE tax_rate_id = OLD.tax_rate_id)
  OR EXISTS (SELECT 1 FROM tax_assessments WHERE tax_rate_id = OLD.tax_rate_id)
BEGIN SELECT RAISE(ABORT, 'rate already used'); END;

-- The payment is a bank event. Allocations are separate, additive posting events.
CREATE TRIGGER allocate_cash BEFORE INSERT ON payment_allocations
BEGIN
  SELECT CASE WHEN (SELECT owner_id FROM payments WHERE payment_id = NEW.payment_id)
                <> (SELECT owner_id FROM case_periods WHERE case_id = NEW.case_id)
              THEN RAISE(ABORT, 'payment and case have different owners') END;
  SELECT CASE WHEN NEW.allocated_pence > (SELECT amount_pence FROM payments WHERE payment_id = NEW.payment_id)
                   - (SELECT COALESCE(SUM(allocated_pence), 0) FROM payment_allocations WHERE payment_id = NEW.payment_id)
              THEN RAISE(ABORT, 'allocation exceeds available payment') END;
END;
CREATE TRIGGER payment_update BEFORE UPDATE ON payments
BEGIN SELECT RAISE(ABORT, 'posted payment is immutable'); END;
CREATE TRIGGER payment_delete BEFORE DELETE ON payments
BEGIN SELECT RAISE(ABORT, 'posted payment is immutable'); END;
CREATE TRIGGER allocation_update BEFORE UPDATE ON payment_allocations
BEGIN SELECT RAISE(ABORT, 'posted allocation is immutable'); END;
CREATE TRIGGER allocation_delete BEFORE DELETE ON payment_allocations
BEGIN SELECT RAISE(ABORT, 'posted allocation is immutable'); END;

-- Check a decision WHEN it is made. A later sale can shorten the case;
-- a corrected observation must not change the inputs of an earlier decision.
CREATE VIEW matching_estimates AS
SELECT d.declaration_id
FROM declarations d JOIN case_periods c USING (case_id)
JOIN tax_rates r ON r.tax_rate_id = d.tax_rate_id
LEFT JOIN declarations old ON old.declaration_id = d.supersedes_declaration_id
WHERE r.vehicle_type_id = c.vehicle_type_id AND r.tax_year_id = c.tax_year_id
  AND (d.supersedes_declaration_id IS NULL OR (old.case_id = d.case_id AND old.status = 'SUPERSEDED'
       AND old.revision_no < d.revision_no AND old.submitted_at <= d.submitted_at))
  AND d.coverage_start_at = c.period_start_at AND d.coverage_end_at = c.period_end_at
  AND d.submitted_at >= c.created_at
  AND d.advance_due_pence = (d.estimated_miles * r.half_pence_per_mile + 1) / 2;

CREATE VIEW issuable_assessments AS
SELECT a.assessment_id
FROM tax_assessments a JOIN case_periods c USING (case_id)
JOIN tax_rates r USING (tax_rate_id)
JOIN odometer_readings b ON b.reading_id = a.opening_reading_id
JOIN odometer_readings e ON e.reading_id = a.closing_reading_id
LEFT JOIN tax_assessments old ON old.assessment_id = a.supersedes_assessment_id
WHERE r.vehicle_type_id = c.vehicle_type_id AND r.tax_year_id = c.tax_year_id
  AND (a.supersedes_assessment_id IS NULL OR (old.case_id = a.case_id AND old.status = 'SUPERSEDED'
       AND old.revision_no < a.revision_no AND old.assessed_at <= a.assessed_at))
  AND a.period_start_at = c.period_start_at AND a.period_end_at = c.period_end_at
  AND b.vehicle_id = c.vehicle_id AND e.vehicle_id = c.vehicle_id
  AND b.observed_at = a.period_start_at AND e.observed_at = a.period_end_at
  AND b.verification_status = 'ACCEPTED' AND e.verification_status = 'ACCEPTED'
  AND a.assessed_at >= MAX(c.created_at, b.verified_at, e.verified_at, b.recorded_at, e.recorded_at)
  AND e.odometer_miles >= b.odometer_miles
  AND a.final_tax_pence = ((e.odometer_miles - b.odometer_miles) * r.half_pence_per_mile + 1) / 2;

CREATE TRIGGER accept_submission AFTER INSERT ON declarations
WHEN NEW.status = 'SUPERSEDED' OR (NEW.status = 'ACCEPTED' AND NOT EXISTS
  (SELECT 1 FROM matching_estimates WHERE declaration_id = NEW.declaration_id))
BEGIN SELECT RAISE(ABORT, 'invalid coverage, rate or advance'); END;
CREATE TRIGGER accept_draft AFTER UPDATE OF status ON declarations
WHEN NEW.status = 'ACCEPTED' AND NOT EXISTS (SELECT 1 FROM matching_estimates WHERE declaration_id = NEW.declaration_id)
BEGIN SELECT RAISE(ABORT, 'invalid coverage, rate or advance'); END;
CREATE TRIGGER issue_decision AFTER INSERT ON tax_assessments
WHEN NEW.status = 'SUPERSEDED' OR (NEW.status = 'ISSUED' AND NOT EXISTS
  (SELECT 1 FROM issuable_assessments WHERE assessment_id = NEW.assessment_id))
BEGIN SELECT RAISE(ABORT, 'incorrect assessment or unavailable boundary evidence'); END;
CREATE TRIGGER issue_draft AFTER UPDATE OF status ON tax_assessments
WHEN NEW.status = 'ISSUED' AND NOT EXISTS (SELECT 1 FROM issuable_assessments WHERE assessment_id = NEW.assessment_id)
BEGIN SELECT RAISE(ABORT, 'incorrect assessment or unavailable boundary evidence'); END;

-- Corrections keep the old facts. Mark the old version SUPERSEDED and post
-- its linked successor in the same transaction; the loader validates the chain.
CREATE TRIGGER declaration_facts BEFORE UPDATE OF declaration_id, case_id, revision_no,
  coverage_start_at, coverage_end_at, estimated_miles, tax_rate_id, advance_due_pence,
  submitted_at, supersedes_declaration_id ON declarations
WHEN OLD.status IN ('ACCEPTED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve accepted declaration'); END;
CREATE TRIGGER declaration_state BEFORE UPDATE OF status ON declarations
WHEN (OLD.status IN ('ACCEPTED', 'SUPERSEDED')) <> (NEW.status = 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'cannot reopen accepted declaration'); END;
CREATE TRIGGER declaration_delete BEFORE DELETE ON declarations WHEN OLD.status IN ('ACCEPTED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve accepted declaration'); END;

CREATE TRIGGER reading_facts BEFORE UPDATE OF reading_id, vehicle_id, mot_centre_id, observed_at,
  odometer_miles, reading_kind, evidence_ref, recorded_at, verified_at, supersedes_reading_id ON odometer_readings
WHEN OLD.verification_status IN ('ACCEPTED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve verified evidence'); END;
CREATE TRIGGER reading_state BEFORE UPDATE OF verification_status ON odometer_readings
WHEN (OLD.verification_status IN ('ACCEPTED', 'SUPERSEDED')) <> (NEW.verification_status = 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'cannot reopen verified evidence'); END;
CREATE TRIGGER reading_delete BEFORE DELETE ON odometer_readings WHEN OLD.verification_status IN ('ACCEPTED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve verified evidence'); END;
CREATE TRIGGER reading_insert BEFORE INSERT ON odometer_readings WHEN NEW.verification_status = 'SUPERSEDED'
BEGIN SELECT RAISE(ABORT, 'verify a reading before superseding it'); END;

CREATE TRIGGER assessment_facts BEFORE UPDATE OF assessment_id, case_id, revision_no,
  opening_reading_id, closing_reading_id, tax_rate_id, period_start_at, period_end_at,
  final_tax_pence, assessed_at, supersedes_assessment_id ON tax_assessments
WHEN OLD.status IN ('ISSUED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve issued assessment'); END;
CREATE TRIGGER assessment_state BEFORE UPDATE OF status ON tax_assessments
WHEN (OLD.status IN ('ISSUED', 'SUPERSEDED')) <> (NEW.status = 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'cannot reopen issued assessment'); END;
CREATE TRIGGER assessment_delete BEFORE DELETE ON tax_assessments WHEN OLD.status IN ('ISSUED', 'SUPERSEDED')
BEGIN SELECT RAISE(ABORT, 'preserve issued assessment'); END;
