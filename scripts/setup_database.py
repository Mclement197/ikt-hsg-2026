import sqlite3
import sys
from pathlib import Path

root_path = Path(__file__).parent.parent

db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root_path / "database/electromobility.db"
conn = sqlite3.connect(db_path)
conn.execute("PRAGMA foreign_keys = ON")

# Vehicle owners
conn.execute("""
CREATE TABLE IF NOT EXISTS vehicle_owners (
    owner_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    postal_address TEXT NOT NULL
)
""")

# Vehicles: owner_id is the current registration.
conn.execute("""
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES vehicle_owners(owner_id)
)
""")

# Declarations: owner_id is the person liable for this period.
conn.execute("""
CREATE TABLE IF NOT EXISTS declarations (
    declaration_id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    estimated_miles INTEGER NOT NULL,
    advance_due_pence INTEGER NOT NULL,
    submitted_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (owner_id) REFERENCES vehicle_owners(owner_id),
    UNIQUE (vehicle_id, period_start)
)
""")

# MOT inspections
conn.execute("""
CREATE TABLE IF NOT EXISTS mot_inspections (
    inspection_id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    inspection_date TEXT NOT NULL,
    odometer_miles INTEGER NOT NULL,
    mot_centre_ref TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    UNIQUE (vehicle_id, inspection_date)
)
""")

# Final tax assessments
conn.execute("""
CREATE TABLE IF NOT EXISTS tax_assessments (
    assessment_id INTEGER PRIMARY KEY,
    declaration_id INTEGER NOT NULL UNIQUE,
    opening_inspection_id INTEGER NOT NULL UNIQUE,
    closing_inspection_id INTEGER NOT NULL UNIQUE,
    assessed_at TEXT NOT NULL,
    final_tax_pence INTEGER NOT NULL,
    FOREIGN KEY (declaration_id) REFERENCES declarations(declaration_id),
    FOREIGN KEY (opening_inspection_id) REFERENCES mot_inspections(inspection_id),
    FOREIGN KEY (closing_inspection_id) REFERENCES mot_inspections(inspection_id)
)
""")

# Payments: ADVANCE, ADDITIONAL or REFUND
conn.execute("""
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY,
    declaration_id INTEGER NOT NULL,
    payment_type TEXT NOT NULL,
    amount_pence INTEGER NOT NULL,
    paid_at TEXT NOT NULL,
    FOREIGN KEY (declaration_id) REFERENCES declarations(declaration_id)
)
""")

conn.commit()
conn.close()

