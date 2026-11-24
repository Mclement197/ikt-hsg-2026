import sqlite3
import sys
from pathlib import Path

root_path = Path(__file__).parent.parent

db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root_path / "database/electromobility.db"
conn = sqlite3.connect(db_path)
conn.execute("PRAGMA foreign_keys = ON")

conn.executescript((root_path / "database" / "queries" / "sample_data.sql").read_text(encoding="utf-8"))

conn.commit()
conn.close()
