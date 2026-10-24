import sqlite3

conn = sqlite3.connect("../database/electromobility.db")

conn.execute("""
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY,
    vehicle_type TEXT NOT NULL,
    mileage INTEGER NOT NULL
)
""")

conn.commit()
conn.close()