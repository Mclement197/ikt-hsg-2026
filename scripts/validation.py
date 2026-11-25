"""Checks that need the whole batch, after the inserts and before commit."""


def validate(db):
    if db.execute("PRAGMA foreign_key_check").fetchone():
        raise ValueError("Foreign key without a parent")

    # Only the current accepted observations form the vehicle's mileage history.
    previous = {}
    for vehicle, miles in db.execute("""
        SELECT vehicle_id, odometer_miles FROM odometer_readings
        WHERE verification_status = 'ACCEPTED' ORDER BY vehicle_id, observed_at
    """):
        if miles < previous.get(vehicle, 0):
            raise ValueError(f"Odometer decreased on vehicle {vehicle}")
        previous[vehicle] = miles

    # All three revision links have the same rule: the predecessor is earlier
    # and belongs to the same case (or vehicle). A draft does not replace it.
    for table, key, scope, sequence, timestamp, status, current in (
        ("declarations", "declaration_id", "case_id", "revision_no", "submitted_at", "status", "ACCEPTED"),
        ("tax_assessments", "assessment_id", "case_id", "revision_no", "assessed_at", "status", "ISSUED"),
        ("odometer_readings", "reading_id", "vehicle_id", "recorded_at", "recorded_at", "verification_status", "ACCEPTED"),
    ):
        earlier, superseded, replaced = {}, set(), set()
        for row_id, account, when, state, parent in db.execute(f"""
            SELECT {key}, {scope}, {timestamp}, {status}, supersedes_{key}
            FROM {table} ORDER BY {sequence}, {key}
        """):
            if parent is not None:
                if parent not in earlier or earlier[parent][0] != account or earlier[parent][1] > when:
                    raise ValueError(f"{table} {row_id}: predecessor is not earlier in this {scope}")
                if state in (current, "SUPERSEDED"):
                    if parent not in superseded or parent in replaced:
                        raise ValueError(f"{table} {row_id}: invalid revision chain")
                    replaced.add(parent)
            if state == "SUPERSEDED":
                superseded.add(row_id)
            earlier[row_id] = account, when
        if superseded != replaced:
            raise ValueError(f"{table}: superseded record without an approved successor")
