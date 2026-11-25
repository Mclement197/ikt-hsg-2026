import sqlite3
import sys
from pathlib import Path
from validation import validate

database = Path(__file__).resolve().parents[1] / "database"
path = Path(sys.argv[1]) if len(sys.argv) > 1 else database / "electromobility.db"
db = sqlite3.connect(path.resolve().as_uri() + "?mode=rw", uri=True)
db.execute("PRAGMA foreign_keys = ON")
db.execute("PRAGMA recursive_triggers = ON")

with db:
    for name, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
        table = name.replace('"', '""')
        if db.execute(f'SELECT 1 FROM "{table}" LIMIT 1').fetchone():
            sys.exit(f"{path} already contains data in {name}. Load the sample once on a fresh schema.")
    db.executescript("BEGIN;\n" + (database / "queries/sample_data.sql").read_text(encoding="utf-8"))
    validate(db)
db.close()
print(f"Loaded and checked the five sample cases: {path}")
