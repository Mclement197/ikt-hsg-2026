import sqlite3
import sys
from pathlib import Path

database = Path(__file__).resolve().parents[1] / "database"
path = Path(sys.argv[1]) if len(sys.argv) > 1 else database / "electromobility.db"
conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)

for report in (database / "queries/expected_revenue.sql", database / "queries/additional_tax.sql",
               database.parent / "presentation/assets/outstanding_validation.sql", database / "queries/queries.sql"):
    print(report.name)
    cursor = conn.execute(report.read_text(encoding="utf-8"))
    print([column[0] for column in cursor.description])
    for row in cursor:
        print(row)
    print()

conn.close()
