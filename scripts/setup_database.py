import sqlite3
import sys
from pathlib import Path

database = Path(__file__).resolve().parents[1] / "database"
path = Path(sys.argv[1]) if len(sys.argv) > 1 else database / "electromobility.db"
db = sqlite3.connect(path)
db.execute("PRAGMA foreign_keys = ON")
with db:
    if db.execute("SELECT 1 FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").fetchone():
        sys.exit(f"{path} already contains a schema. Use a new file to rebuild.")
    db.executescript("BEGIN;\n" + (database / "schema.sql").read_text(encoding="utf-8"))
db.close()
print(f"Created schema: {path}")
