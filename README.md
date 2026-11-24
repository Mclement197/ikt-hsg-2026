# IKT HS2026 · Case A: UK electric vehicle mileage tax

**[English review PowerPoint](presentation/final_presentation.pptx)** · **[SQLite database](database/electromobility.db)** · [Scope and assumptions](Scope.md)

The case charges 3 pence per mile for battery electric vehicles (BEV) and 1.5 for plug-in hybrids (PHEV). Owners estimate distance; MOT readings establish actual miles without a journey history. The tax authority assesses the difference. Money is stored in integer pence, rounded once after multiplication, half-pennies upwards.

## Follow one case through the design

1. **Declaration and advance:** record the vehicle, the owner liable for the period, estimated miles and advance due. Record advance cash on receipt. `vehicles.owner_id` is the **current registered owner**; `declarations.owner_id` is the **historical liable owner**. Updating a registration does not move an old assessment to the new owner.
2. **Verification and settlement:** the five fictional cases follow the normal 2028/29 annual cycle. In case 5, the odometer rose from 10,000 to 22,000 miles. At 1.5 pence/mile, those 12,000 miles give **£180 final tax**. Its paid advance is £150. There is no additional receipt, so **£30 remains owed**. Issuing an invoice or authorising a refund is distinct from a cash transfer.
3. **Management reporting:** [Analysis 1](database/queries/expected_revenue.sql) groups declared miles and estimated advance liability by vehicle type and **period start year**. [Analysis 2](database/queries/additional_tax.sql) compares final assessments with **advance due**, reporting gross extras and refunds by start year. The [separate cash check](presentation/assets/outstanding_validation.sql) sums signed payments per declaration before joining assessments.

A transfer could use one verified handover reading to close the outgoing owner's period and open a new declaration for the incoming owner. The model allows several segments in a year. Unique `(vehicle_id, period_start)` prevents duplicate starts, not overlapping periods. Transfer processing and transfer-specific valuation are not automated.

Edit the three EPCs in [`diagrams/business_processes/`](diagrams/business_processes/) or inspect them with the context page in [`eved_scope_and_processes.drawio`](eved_scope_and_processes.drawio). The [logical ER drawing and schema views](diagrams/er_diagram/) show the six tables. The EPCs describe agency and human tasks; the runnable prototype consists of the database, sample inserts and SQL.

## Run the database demonstration

From the repository root, using Python's standard library:

```sh
python scripts/queries.py
python presentation/assets/verify_database.py
```

The first command prints both result tables in presentation order. The second opens the deliverable read-only, replays the schema and inserts in memory, verifies the owner links and five settlements, and writes [the evidence JSON](presentation/assets/database_verification.json). The whole sample reconciles as **£1,230 assessed = £1,200 net received + £30 outstanding**. Open `database/electromobility.db` directly in SQLite or SQLiteStudio for inspection.

To reproduce the database **without touching the deliverable**, choose a new, unused path in an existing directory:

```sh
python scripts/setup_database.py presentation/build/case-review.db
python scripts/load_db.py presentation/build/case-review.db
python presentation/assets/verify_database.py presentation/build/case-review.db
```

Setup creates the six tables; load executes [`sample_data.sql`](database/queries/sample_data.sql) **once** on empty tables. Both enable foreign keys on their own connection. A candidate check does not replace the deliverable's evidence. If replacing the deliverable, retain a backup, verify the candidate first, then repeat the default verification.

## Edit, rebuild and record the PowerPoint

The master is [`presentation/final_presentation.tex`](presentation/final_presentation.tex) and its [editable TikZ and appendix sources](presentation/assets/). The English [speaker notes](presentation/speaker_notes_en.md) cover slides **1–19**; **A1–A23** contain the complete models, schema, queries, results and sources. [Task coverage](presentation/requirements_checklist.md) · [Verification](presentation/verification.md) · [Author input required](presentation/author_review.md).

- **Preview:** from `presentation/`, run `latexmk -r build/latexmkrc final_presentation.tex`. Requires XeLaTeX, Metropolis and Fira fonts, Perl and latexmk 4.87+. The generated `final_presentation.pdf` is ignored. In VS Code, open the repo root and use LaTeX Workshop (**Ctrl+Alt+B** build, **Ctrl+Alt+V** preview).
- **Export:** from the **repository root**, run `uv run presentation/export_pptx.py`. [uv](https://docs.astral.sh/uv/) installs the script's pinned rendering/PowerPoint dependencies in isolation. The exporter forces a new LaTeX build, checks the titles and order, and writes `presentation/final_presentation.pptx`. All 42 slides are 16:9, with one high-resolution picture per slide and editable notes on the first 19. Slide elements are not individually editable in PowerPoint; change the LaTeX/TikZ and export again.
- **Record after author review and German translation:** open the PowerPoint and **Save As** a separate recording copy, so future exports do not replace your recording. Use **Record → From Beginning**, speak in **your own voice**, and stop after slide 19. Keep every appendix slide in the file without narration. Save the timings, check them in Slide Sorter, and play back slides 1–19 with audio to confirm the German recording is **at most 15:00**.
- **Hand in:** upload the German voice-over PowerPoint and `database/electromobility.db` separately, and complete the official HSG AI-use declaration. The English deck contains no recording.
