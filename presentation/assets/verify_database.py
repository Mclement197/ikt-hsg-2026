"""Rebuild on an empty file, compare with the ER drawing and exercise the reports."""
import json
import sqlite3
import subprocess
import sys
import xml.etree.ElementTree as ET
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "scripts"))
from validation import validate

assets = root / "presentation/assets"
queries = root / "database/queries"
target = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "database/electromobility.db"
forecast = (queries / "expected_revenue.sql").read_text(encoding="utf-8")
january = forecast.replace("2029-04-04", "2029-01-03")
adjustments = (queries / "additional_tax.sql").read_text(encoding="utf-8")
bank = (queries / "queries.sql").read_text(encoding="utf-8")
cash = (assets / "outstanding_validation.sql").read_text(encoding="utf-8")
sample = (queries / "sample_data.sql").read_text(encoding="utf-8")
start, handover, end = "2028-04-01T00:00:00Z", "2029-01-01T00:00:00Z", "2029-04-01T00:00:00Z"
reject = TestCase().assertRaises


def connect(path):
    db = sqlite3.connect(path, uri=True)
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA recursive_triggers = ON")
    return db


with TemporaryDirectory() as tmp:
    fresh = Path(tmp) / "fresh case.db"
    for script in ("setup_database", "load_db"):
        subprocess.run([sys.executable, root / f"scripts/{script}.py", fresh], check=True, cwd=tmp)
    # Rerunning either command must not append records or replace an existing database.
    for script in ("setup_database", "load_db"):
        retry = subprocess.run([sys.executable, root / f"scripts/{script}.py", fresh], capture_output=True)
        assert retry.returncode != 0 and b"already contains" in retry.stderr

    with closing(connect(fresh)) as copy, closing(connect(target.resolve().as_uri() + "?mode=ro")) as db:
        assert list(copy.iterdump()) == list(db.iterdump()), "Fresh schema or data differs from the deliverable"
        assert db.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
        validate(db)

        # Read the actual drawing, including its three inline self-references.
        er = ET.parse(root / "diagrams/er_diagram/ikt-proposed-er-diagram.drawio")
        tables = [t.get("entity") for t in er.findall('.//object[@kind="table"]')]
        assert set(tables) == {t for t, in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        links = set()
        drawn_links = {(r.get("child_entity"), r.get("foreign_key"), r.get("parent_entity"), r.get("parent_key"))
                       for r in er.findall('.//object[@kind="relationship"]')}
        for table in tables:
            fields = er.findall(f'.//object[@kind="field"][@entity="{table}"]')
            columns = db.execute(f"PRAGMA table_info({table})").fetchall()
            assert [(col, bool(pk), not (required or pk)) for _, col, _, required, _, pk in columns] == [
                (f.get("column"), f.get("key") == "PK", f.get("nullable") == "true") for f in fields]
            unique_columns = {tuple(c[2] for c in db.execute(f"PRAGMA index_info({idx[1]})"))
                              for idx in db.execute(f"PRAGMA index_list({table})") if idx[2] and not idx[4]}
            for f in fields:
                if f.get("key") == "UQ":
                    assert (f.get("column"),) in unique_columns
            links.update((table, row[3], row[2], row[4]) for row in db.execute(f"PRAGMA foreign_key_list({table})"))
            for f in fields:
                col = f.get("column")
                if col.startswith("supersedes_"):
                    drawn_links.add((table, col, table, col.removeprefix("supersedes_")))
        assert links == drawn_links and len(links) == 21
        counts = {t: db.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in tables}
        assert counts == dict(vehicle_owners=5, vehicles=4, vehicle_types=2, ownership_periods=5,
                              tax_cases=5, payments=8, payment_allocations=8, tax_years=1, tax_rates=2,
                              declarations=5, mot_centres=4, odometer_readings=9, tax_assessments=5)
        cases = db.execute("""
            SELECT c.case_id, full_name, c.vehicle_id, c.period_start_at, c.period_end_at, d.coverage_end_at,
                   d.estimated_miles, d.advance_due_pence, b.odometer_miles, e.odometer_miles, a.final_tax_pence
            FROM case_periods c JOIN vehicle_owners USING (owner_id)
            JOIN declarations d ON d.case_id = c.case_id AND d.status = 'ACCEPTED'
            JOIN tax_assessments a ON a.case_id = c.case_id AND a.status = 'ISSUED'
            JOIN odometer_readings b ON b.reading_id = a.opening_reading_id
            JOIN odometer_readings e ON e.reading_id = a.closing_reading_id
            ORDER BY c.case_id""").fetchall()
        assert cases == [
            (1, "Alice Example", 1, start, handover, end, 10000, 30000, 20000, 26000, 18000),
            (2, "Ben Example",   1, handover, end,   end,  5000, 15000, 26000, 32000, 18000),
            (3, "Clara Example", 2, start, end,      end, 10000, 30000, 15000, 25000, 30000),
            (4, "Daniel Example",3, start, end,      end,  8000, 12000, 30000, 40000, 15000),
            (5, "Emma Example",  4, start, end,      end, 10000, 15000, 10000, 22000, 18000)]
        assert db.execute("SELECT owner_id FROM ownership_periods WHERE vehicle_id=1 AND valid_to_at IS NULL").fetchall() == [(2,)]
        assert db.execute("""SELECT s.closing_reading_id, b.opening_reading_id FROM tax_assessments s,
                          tax_assessments b WHERE s.case_id=1 AND b.case_id=2""").fetchone() == (2, 2)
        final = db.execute(forecast).fetchall()
        gross = db.execute(adjustments).fetchall()
        balances = db.execute(cash).fetchall()
        posted = db.execute(bank).fetchall()
        assert final == [("2028/29", "BEV", 2, 22000, 660, 0), ("2028/29", "PHEV", 2, 22000, 330, 0)]
        assert gross == [("2028/29", 5, 3, 1, 90, 120, 0)]
        assert balances == [(1,180,180,0), (2,180,180,0), (3,300,300,0), (4,150,150,0), (5,180,150,30)]
        assert [(p[1], p[3], p[4]) for p in posted] == [(i, "IN", r[7]) for i, r in enumerate(cases, 1)] + [
            (1, "OUT", 12000), (2, "IN", 3000), (4, "IN", 3000)]
        assert all(p[4] == p[5] and p[6] == 0 for p in posted)
        assert sum(row[1] for row in balances) == 990 == sum(row[2] for row in balances) + 30

        # Invalid writes on a disposable copy.
        for sql in (
            "INSERT INTO ownership_periods VALUES (6,1,4,'2029-02-01T00:00:00Z',NULL)",
            "INSERT INTO tax_years VALUES (2,'overlap','2029-01-01T00:00:00Z','2030-01-01T00:00:00Z')",
            "UPDATE ownership_periods SET valid_to_at='2028-12-01T00:00:00Z' WHERE ownership_id=1",
            "UPDATE tax_years SET ends_at='2030-04-01T00:00:00Z' WHERE tax_year_id=1",
            "UPDATE tax_rates SET half_pence_per_mile=7 WHERE tax_rate_id=1",
            "UPDATE declarations SET estimated_miles=1 WHERE declaration_id=1",
            "UPDATE tax_assessments SET final_tax_pence=0 WHERE assessment_id=1",
            "UPDATE odometer_readings SET odometer_miles=0 WHERE reading_id=2",
            "INSERT INTO payments VALUES (9,1,'IN',1,'2029-02-30T00:00:00Z','DemoBank','TX-009')",
            "INSERT INTO payments SELECT 9,owner_id,direction,amount_pence,paid_at,source_system,external_reference FROM payments WHERE payment_id=1",
            "DELETE FROM payment_allocations WHERE allocation_id=1",
            "UPDATE payments SET amount_pence=1 WHERE payment_id=1",
            "UPDATE declarations SET status='SUPERSEDED' WHERE case_id=1",  # no successor in this batch
            """INSERT INTO odometer_readings VALUES (10,1,1,'2029-05-01T00:00:00Z',1,'MOT','ACCEPTED',
               'bad miles','2029-05-01T00:00:00Z','2029-05-01T00:00:00Z',NULL)""",
        ):
            with reject((ValueError, sqlite3.IntegrityError), msg=sql):
                copy.execute(sql)
                validate(copy)
            copy.rollback()

        # A later sale can close an ownership without changing last year's issued period.
        copy.execute("UPDATE ownership_periods SET valid_to_at='2029-06-01T00:00:00Z' WHERE ownership_id=2")
        assert copy.execute(forecast).fetchall() == final
        copy.rollback()

        # One bank payment, two of Daniel's cases, three postings, and some cash left over.
        copy.executescript("""
            BEGIN;
            INSERT INTO tax_years VALUES (2,'2029/30','2029-04-01T00:00:00Z','2030-04-01T00:00:00Z');
            INSERT INTO tax_cases VALUES (6,4,2,'2029-04-01T08:00:00Z');
            INSERT INTO payments VALUES (9,4,'IN',900,'2029-04-03T12:00:00Z','DemoBank','TX-009');
        """)
        assert copy.execute(bank).fetchall()[-1][-2:] == (0, 900)
        copy.executemany("INSERT INTO payment_allocations VALUES (?,9,?,?,?)",
                         [(9,4,100,"a"), (10,4,200,"b"), (11,6,400,"c")])
        assert copy.execute(bank).fetchall()[-1][-2:] == (700, 200)
        assert copy.execute(cash).fetchall()[3] == (4,150,153,-3)
        for case, amount, reference in [(4,201,"d"), (5,1,"d"), (4,1,"a")]:
            with reject(sqlite3.IntegrityError):
                copy.execute("INSERT INTO payment_allocations VALUES (12,9,?,?,?)", (case,amount,reference))
        copy.rollback()

        # Correct a PHEV observation. The old decision still uses its exact original reading.
        copy.executescript("""
            BEGIN;
            UPDATE odometer_readings SET verification_status='SUPERSEDED' WHERE reading_id=7;
            INSERT INTO odometer_readings VALUES (10,3,3,'2029-04-01T00:00:00Z',40001,'PERIOD_BOUNDARY',
              'ACCEPTED','END-301-C','2029-04-03T10:00:00Z','2029-04-03T10:05:00Z',7);
            INSERT INTO tax_assessments SELECT 6,case_id,2,opening_reading_id,closing_reading_id,tax_rate_id,
              period_start_at,period_end_at,final_tax_pence,'2029-04-03T11:00:00Z','DRAFT',assessment_id
              FROM tax_assessments WHERE assessment_id=4;
        """)
        validate(copy)
        assert copy.execute(forecast).fetchall() == final and copy.execute(adjustments).fetchall() == gross
        copy.execute("UPDATE tax_assessments SET status='SUPERSEDED' WHERE assessment_id=4")
        with reject(sqlite3.IntegrityError):  # A valid reading ID from a different vehicle is not evidence.
            copy.execute("UPDATE tax_assessments SET opening_reading_id=4,closing_reading_id=5,status='ISSUED' WHERE assessment_id=6")
        with reject(sqlite3.IntegrityError):  # No re-issuing against superseded evidence.
            copy.execute("UPDATE tax_assessments SET status='ISSUED' WHERE assessment_id=6")
        with reject(sqlite3.IntegrityError):  # 10,001 PHEV miles are 15,001.5p, rounded UP.
            copy.execute("UPDATE tax_assessments SET closing_reading_id=10,final_tax_pence=15001,status='ISSUED' WHERE assessment_id=6")
        copy.execute("UPDATE tax_assessments SET closing_reading_id=10,final_tax_pence=15002,status='ISSUED' WHERE assessment_id=6")
        validate(copy)
        assert copy.execute(forecast).fetchall()[1] == ("2028/29","PHEV",2,22001,330.02,0)
        assert copy.execute(adjustments).fetchall() == [("2028/29",5,3,1,90.02,120,0)]
        assert copy.execute(cash).fetchall()[3] == (4,150.02,150,0.02)
        copy.rollback()

# Replay only the January state; future year-end evidence and bank events do not exist.
with closing(connect(":memory:")) as db:
    db.executescript((root / "database/schema.sql").read_text(encoding="utf-8"))
    before_refund, rest = sample.split("-- Refund paid")
    db.executescript(before_refund)
    assert db.execute(cash).fetchall() == [(1,180,300,-120)]
    db.executescript("-- Refund paid" + rest.split("-- Annual closing")[0])
    validate(db)
    midyear = db.execute(january).fetchall()
    assert midyear == [("2028/29","BEV",2,21000,630,0), ("2028/29","PHEV",2,18000,270,0)]
    assert db.execute(forecast).fetchall() == [("2028/29","BEV",2,None,None,2), ("2028/29","PHEV",2,None,None,2)]
    # Pending evidence can lack a centre; accepting it cannot.
    db.execute("""INSERT INTO odometer_readings VALUES (10,2,NULL,'2029-01-02T12:00:00Z',22000,
               'MOT','PENDING','PENDING-201','2029-01-02T12:01:00Z',NULL,NULL)""")
    with reject(sqlite3.IntegrityError):
        db.execute("""UPDATE odometer_readings SET verification_status='ACCEPTED',verified_at='2029-01-02T12:10:00Z'
                   WHERE reading_id=10""")
    db.rollback()
    # An open case whose effective coverage changed needs a revision, not the old estimate.
    db.execute("UPDATE ownership_periods SET valid_to_at='2029-03-01T00:00:00Z' WHERE ownership_id=3")
    assert db.execute(january).fetchall()[0] == ("2028/29","BEV",2,None,None,1)
    db.rollback()
    # One-mile revised estimate: drafts do not displace the original accepted demand.
    db.execute("""INSERT INTO declarations SELECT 6,case_id,2,coverage_start_at,coverage_end_at,1,
               tax_rate_id,2,'2029-01-02T08:00:00Z','DRAFT',declaration_id FROM declarations WHERE case_id=4""")
    assert db.execute(january).fetchall() == midyear
    db.execute("UPDATE declarations SET status='SUPERSEDED' WHERE declaration_id=4")
    db.execute("UPDATE declarations SET status='ACCEPTED' WHERE declaration_id=6")
    validate(db)
    assert db.execute(january).fetchall()[1] == ("2028/29","PHEV",2,10001,150.02,0)
    db.executescript(sample.split("-- Annual closing")[1])
    assert db.execute(adjustments).fetchall() == gross  # comparison is with Daniel's original £120

evidence = dict(counts=counts, foreign_keys=len(links), cases=cases, january_forecast=midyear,
                final_forecast=final, adjustments=gross, cash_by_case=balances, posted_payments=posted,
                integrity="ok", foreign_key_errors=0)
if len(sys.argv) == 1:
    (assets / "database_verification.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
print("Verified fresh rebuild: 13 tables, 21 foreign keys, five cases. January GBP 900; "
      "April GBP 990 assessed = GBP 960 net cash + GBP 30 outstanding.")
