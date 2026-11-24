import sqlite3
from pathlib import Path

database = Path(__file__).resolve().parents[1] / "database"
conn = sqlite3.connect((database / "electromobility.db").as_uri() + "?mode=ro", uri=True)

for filename in ("expected_revenue.sql", "additional_tax.sql"):
    print(filename)
    cursor = conn.execute((database / "queries" / filename).read_text(encoding="utf-8"))
    print([column[0] for column in cursor.description])
    for row in cursor:
        print(row)
    print()

conn.close()
