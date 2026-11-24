"""Read-only presentation evidence; run from any directory with standard Python.

An optional path checks a candidate DB without publishing an evidence report.
The database is opened with mode=ro. Schema/sample replay uses memory.
This validates the sample, not a production tax engine or all possible inputs.
"""
import ast
import hashlib
import json
import sqlite3
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent
DELIVERABLE = ROOT / "database/electromobility.db"
DB = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DELIVERABLE
before = hashlib.sha256(DB.read_bytes()).hexdigest()
conn = sqlite3.connect(DB.as_uri() + "?mode=ro", uri=True)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("PRAGMA query_only = ON")


def rows(sql):
    return [dict(row) for row in conn.execute(sql)]


integrity = [row[0] for row in conn.execute("PRAGMA integrity_check")]
foreign_keys = rows("PRAGMA foreign_key_check")
assert integrity == ["ok"] and foreign_keys == []
tables = [row[0] for row in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
)]
metadata = {}
for table in tables:
    metadata[table] = {
        "columns": rows(f'PRAGMA table_info("{table}")'),
        "foreign_keys": rows(f'PRAGMA foreign_key_list("{table}")'),
        "unique_indexes": {
            index[1]: rows(f'PRAGMA index_info("{index[1]}")')
            for index in conn.execute(f'PRAGMA index_list("{table}")') if index[2]
        },
        "rows": conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0],
    }
assert {t: metadata[t]["rows"] for t in tables} == {
    "vehicle_owners": 5, "vehicles": 5, "declarations": 5,
    "mot_inspections": 10, "tax_assessments": 5, "payments": 8}
for table in ("vehicles", "declarations"):
    assert any(c["name"] == "owner_id" and c["notnull"] for c in metadata[table]["columns"])
    assert any((fk["from"], fk["table"], fk["to"]) == ("owner_id", "vehicle_owners", "owner_id")
               for fk in metadata[table]["foreign_keys"])

analyses = {}
for name in ("expected_revenue", "additional_tax"):
    sql = (ROOT / f"database/queries/{name}.sql").read_text(encoding="utf-8")
    analyses[name] = rows(sql)
assert [tuple(r.values()) for r in analyses["expected_revenue"]] == [
    ("2028", "BEV", 3, 30000, 900), ("2028", "PHEV", 2, 18000, 270)]
assert [tuple(r.values()) for r in analyses["additional_tax"]] == [("2028", 5, 3, 1, 120, 60)]

case_sql = """
WITH cash AS (
  SELECT declaration_id,
    SUM(CASE WHEN payment_type='ADVANCE' THEN amount_pence ELSE 0 END) AS advance_paid,
    SUM(CASE WHEN payment_type='ADDITIONAL' THEN amount_pence ELSE 0 END) AS extra_paid,
    SUM(CASE WHEN payment_type='REFUND' THEN amount_pence ELSE 0 END) AS refund_paid
  FROM payments GROUP BY declaration_id
)
SELECT d.declaration_id, v.vehicle_type, d.vehicle_id,
  d.owner_id AS liable_owner_id, v.owner_id AS current_owner_id, a.assessed_at,
  d.period_start, d.period_end, d.estimated_miles, d.advance_due_pence,
  o.inspection_id AS opening_id, c.inspection_id AS closing_id,
  o.vehicle_id AS opening_vehicle, c.vehicle_id AS closing_vehicle,
  o.inspection_date AS opening_date, c.inspection_date AS closing_date,
  o.odometer_miles AS opening_miles, c.odometer_miles AS closing_miles,
  c.odometer_miles-o.odometer_miles AS actual_miles, a.final_tax_pence,
  COALESCE(cash.advance_paid,0) AS advance_paid,
  COALESCE(cash.extra_paid,0) AS extra_paid,
  COALESCE(cash.refund_paid,0) AS refund_paid,
  COALESCE(cash.advance_paid+cash.extra_paid-cash.refund_paid,0) AS net_cash,
  a.final_tax_pence-COALESCE(cash.advance_paid+cash.extra_paid-cash.refund_paid,0)
    AS remaining_balance
FROM declarations d
JOIN vehicles v ON v.vehicle_id=d.vehicle_id
JOIN tax_assessments a ON a.declaration_id=d.declaration_id
JOIN mot_inspections o ON o.inspection_id=a.opening_inspection_id
JOIN mot_inspections c ON c.inspection_id=a.closing_inspection_id
LEFT JOIN cash ON cash.declaration_id=d.declaration_id
ORDER BY d.declaration_id
"""
cases = rows(case_sql)
assert [c["declaration_id"] for c in cases] == [1, 2, 3, 4, 5]
assert [c["remaining_balance"] for c in cases] == [0, 0, 0, 0, 3000]
supplementary = rows((ASSETS / "outstanding_validation.sql").read_text(encoding="utf-8"))
assert [tuple(r.values()) for r in supplementary] == [
    (c["declaration_id"], c["final_tax_pence"] / 100, c["net_cash"] / 100,
     c["remaining_balance"] / 100) for c in cases]
for case in cases:
    # Only the five annual examples have this property.
    assert case["liable_owner_id"] == case["current_owner_id"] == case["declaration_id"]
    assert case["vehicle_id"] == case["opening_vehicle"] == case["closing_vehicle"]
    assert case["opening_date"] == case["period_start"] == "2028-04-01"
    assert case["closing_date"] == case["period_end"] == "2029-04-01"
    assert case["opening_date"] < case["closing_date"] <= case["assessed_at"][:10]
    assert case["opening_id"] != case["closing_id"]
    assert case["actual_miles"] >= 0 and case["estimated_miles"] >= 0
    rate = {"BEV": Decimal("3"), "PHEV": Decimal("1.5")}[case["vehicle_type"]]
    for miles, amount in [("estimated_miles", "advance_due_pence"),
                          ("actual_miles", "final_tax_pence")]:
        assert case[amount] == int((case[miles] * rate).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP))
    assert case["advance_paid"] == case["advance_due_pence"]
assert conn.execute("""SELECT COUNT(*) FROM payments WHERE amount_pence <= 0
    OR typeof(amount_pence) != 'integer'
    OR payment_type NOT IN ('ADVANCE','ADDITIONAL','REFUND')""").fetchone()[0] == 0

# Replay actual CREATE statements and actual INSERT file only in memory.
memory = sqlite3.connect(":memory:")
memory.execute("PRAGMA foreign_keys = ON")
tree = ast.parse((ROOT / "scripts/setup_database.py").read_text(encoding="utf-8"))
ddl = [node.args[0].value for node in ast.walk(tree)
       if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
       and node.func.attr == "execute" and node.args
       and isinstance(node.args[0], ast.Constant)
       and isinstance(node.args[0].value, str)
       and node.args[0].value.lstrip().startswith("CREATE TABLE")]
assert len(ddl) == 6
for statement in ddl:
    memory.execute(statement)
memory.executescript((ROOT / "database/queries/sample_data.sql").read_text(encoding="utf-8"))
for table in tables:
    assert list(memory.execute(f'SELECT * FROM "{table}" ORDER BY 1')) == [
        tuple(r) for r in conn.execute(f'SELECT * FROM "{table}" ORDER BY 1')]
    for pragma in ("table_info", "foreign_key_list"):
        assert list(memory.execute(f'PRAGMA {pragma}("{table}")')) == [
            tuple(r) for r in conn.execute(f'PRAGMA {pragma}("{table}")')]
    normalize = lambda s: " ".join(s.replace("IF NOT EXISTS ", "").split())
    get_sql = "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
    assert normalize(memory.execute(get_sql, (table,)).fetchone()[0]) == normalize(
        conn.execute(get_sql, (table,)).fetchone()[0])

# Change only the current registration in the disposable replay. The historical
# assessment must still resolve to the period's owner through its declaration.
memory.execute("UPDATE vehicles SET owner_id=2 WHERE vehicle_id=5")
assert memory.execute("""
    SELECT v.owner_id, d.owner_id FROM tax_assessments a
    JOIN declarations d USING (declaration_id) JOIN vehicles v USING (vehicle_id)
    WHERE a.assessment_id=5""").fetchone() == (2, 5)
memory.close()
conn.close()
after = hashlib.sha256(DB.read_bytes()).hexdigest()
assert before == after

totals = {key: sum(c[key] for c in cases) for key in (
    "advance_due_pence", "final_tax_pence", "advance_paid", "extra_paid",
    "refund_paid", "net_cash", "remaining_balance")}
totals["gross_additional_assessed"] = sum(max(0, c["final_tax_pence"]-c["advance_due_pence"]) for c in cases)
totals["gross_refunds_assessed"] = sum(max(0, c["advance_due_pence"]-c["final_tax_pence"]) for c in cases)
report = {"database_sha256": before, "database_unchanged": True,
          "integrity_check": integrity, "foreign_key_check": foreign_keys,
          "metadata": metadata, "analyses": analyses, "cases": cases,
          "supplementary_outstanding": supplementary,
          "totals_pence": totals, "memory_replay_matches": True,
          "registration_change_preserves_liable_owner_in_replay": True,
          "business_rule_sample_checks": "passed; not schema-enforced guarantees"}
if DB == DELIVERABLE:
    (ASSETS / "database_verification.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"counts": {t: metadata[t]["rows"] for t in tables},
                  "analyses": analyses, "totals_pence": totals,
                  "database_unchanged": before == after,
                  "integrity_check": integrity,
                  "foreign_key_check": foreign_keys,
                  "memory_replay_matches": True}, indent=2))
