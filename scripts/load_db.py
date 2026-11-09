import sqlite3
from pathlib import Path

root_path = Path(__file__).parent.parent

conn = sqlite3.connect(root_path / "database/electromobility.db")
conn.execute("PRAGMA foreign_keys = ON")

conn.executescript((root_path / "database" / "queries" / "sample_data.sql").read_text(encoding="utf-8"))

conn.commit()
conn.close()