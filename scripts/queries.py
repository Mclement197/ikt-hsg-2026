import sqlite3
from pathlib import Path

root_path = Path(__file__).parent.parent

conn = sqlite3.connect(root_path / "database/electromobility.db")

additional_tax_querry = (root_path / "database/queries/additional_tax.sql").read_text(encoding="utf-8")
expected_revenue_querry = (root_path / "database/queries/expected_revenue.sql").read_text(encoding="utf-8")



def queries(query_type: int):
    if query_type == 1:
        sql = additional_tax_querry
    elif query_type == 2:
        sql = expected_revenue_querry
    else:
        print("Choose 1 for additional tax or 2 for expected revenue.")
        return

    cursor = conn.execute(sql)

    # Print column names
    print([column[0] for column in cursor.description])

    # Print result rows
    for row in cursor.fetchall():
        print(row)


queries(1)
queries(2)

conn.close()