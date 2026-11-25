# IKT HS2026 · Case A: UK electric vehicle mileage tax

**[English review PowerPoint](presentation/final_presentation.pptx)** · **[SQLite database](database/electromobility.db)** · [Scope and assumptions](Scope.md)

The case charges 3 pence per mile for battery electric vehicles (BEV) and 1.5 for plug-in hybrids (PHEV). Owners estimate distance; verified odometer readings establish actual miles without a journey history. The tax authority assesses the difference. Money is stored in integer pence, rounded once after multiplication, half-pennies upwards.

## Follow one case through the design

1. **Declaration and advance:** `ownership_periods` identifies the owner of a vehicle at a given instant. Each `tax_cases` row links one ownership period to one `tax_years` row. The `case_periods` view gives their effective intersection. Estimates and assessments reference that stable case and their exact tax rate. Cash is posted against its owner and then allocated to cases.
2. **Verification and settlement:** on 1 January 2029 an authorised centre reads 26,000 miles on vehicle 1. Alice drove 6,000 miles, owes £180 and receives £120 back on her £300 advance. Ben takes over at exactly that reading, declares 5,000 remaining miles and pays £150. At 32,000 miles he owes £180 and pays £30 more. Clara breaks even, Daniel pays £30 extra and Emma still owes £30.
3. **Management reporting:** [expected final tax](database/queries/expected_revenue.sql) uses the issued assessment or the accepted estimate for an open case with matching coverage. It groups by the tax year's label and vehicle type. At 3 January the forecast is £900; at 4 April it is £990. A closed case awaiting assessment, or an open case without a matching estimate, makes its group's forecast incomplete. [Gross adjustments](database/queries/additional_tax.sql) compare issued assessments with the **first accepted** advance demand. The [case cash check](presentation/assets/outstanding_validation.sql) sums signed allocations before joining; the [bank reconciliation](database/queries/queries.sql) shows how much of each posted payment is still unallocated.

The demo is a staged fixture with validation, not a transfer service. The seller’s original demand and payment survive early closure; registration does not depend on settlement. See the [schema](database/schema.sql) and [checks](presentation/verification.md).

The [ER drawing](diagrams/er_diagram/ikt-proposed-er-diagram.drawio) defines the **13 tables and 21 foreign keys**. [Generated SQLite schema](diagrams/er_diagram/schema.svg) · [Three business processes](diagrams/business_processes/).

## Run the database demonstration

From the repository root, using Python 3.11+ and its standard library (SQLite 3.37+ for STRICT tables):

```sh
python scripts/queries.py
python presentation/assets/verify_database.py
```

The first command prints both management reports and both cash checks. The verifier compares the database with the ER drawing and with a fresh build from the shipped SQL. It also exercises revisions, split payments and invalid inputs on disposable copies. [Verification results](presentation/assets/database_verification.json): **£990 assessed = £960 net received + £30 outstanding**.

To reproduce the database **without touching the deliverable**, choose a new, unused path in an existing directory:

```sh
python scripts/setup_database.py case-review.db
python scripts/load_db.py case-review.db
python scripts/queries.py case-review.db
python presentation/assets/verify_database.py case-review.db
```

Setup creates the schema in a new file; load executes [`sample_data.sql`](database/queries/sample_data.sql) **once** on empty tables, validates, then commits. Both enable foreign keys and leave populated databases alone. With no path argument the scripts use `database/electromobility.db`. A candidate check does not replace the deliverable's evidence.

## Edit, rebuild and record the PowerPoint

The existing English review deck illustrates the previous six-table schema. Its appendix listings are kept with the slide assets; use the ER drawing and database scripts above for the current implementation.

The master is [`presentation/final_presentation.tex`](presentation/final_presentation.tex) and its [editable TikZ and appendix sources](presentation/assets/). The English [speaker notes](presentation/speaker_notes_en.md) cover slides **1–19**; **A1–A24** contain the complete models, schema, queries, results and sources. [Task coverage](presentation/requirements_checklist.md) · [Verification](presentation/verification.md) · [Author input required](presentation/author_review.md).

- **Preview:** from `presentation/`, run `latexmk -r build/latexmkrc final_presentation.tex`. Requires XeLaTeX, Metropolis and Fira fonts, Perl and latexmk 4.87+. The generated `final_presentation.pdf` is ignored. In VS Code, open the repo root and use LaTeX Workshop (**Ctrl+Alt+B** build, **Ctrl+Alt+V** preview).
- **Export:** from the **repository root**, run `uv run presentation/export_pptx.py`. [uv](https://docs.astral.sh/uv/) installs the script's pinned rendering/PowerPoint dependencies in isolation. The exporter forces a new LaTeX build, checks the titles and order, and writes `presentation/final_presentation.pptx`. All 43 slides are 16:9, with one high-resolution picture per slide and editable notes on the first 19. Slide elements are not individually editable in PowerPoint; change the LaTeX/TikZ and export again.
- **Record after author review and German translation:** open the PowerPoint and **Save As** a separate recording copy, so future exports do not replace your recording. Use **Record → From Beginning**, speak in **your own voice**, and stop after slide 19. Keep every appendix slide in the file without narration. Save the timings, check them in Slide Sorter, and play back slides 1–19 with audio to confirm the German recording is **at most 15:00**.
- **Hand in:** upload the German voice-over PowerPoint and `database/electromobility.db` separately, and complete the official HSG AI-use declaration. The English deck contains no recording.
