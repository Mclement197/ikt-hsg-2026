# Requirements and evidence checklist

## Deliverable and numbering

- **English review draft:** `final_presentation.tex` and `final_presentation.pdf` are the sole main deck. The existing XeLaTeX/Metropolis build and `build/` preview location are retained.
- **19 narrated slides + 23 unnarrated appendix slides = 42 PDF pages.** Main slide numbers equal PDF page numbers. Appendix **A*n*** is PDF page **19 + *n*** (A1 = 20, A23 = 42).
- `speaker_notes_en.md` follows the 19 slide titles/numbers. Its 1,703 spoken words target **13:40**, including approximately 90 seconds of pauses at a 140-word/minute speaking pace. This is an estimate, not a timed recording.
- **Not the final submission:** German voice-over PowerPoint, personal narration, author-confirmed reflection, the separate HSG AI declaration and separate database upload remain required. See `author_review.md`.

## Mandatory Tasks 1–7

| Requirement | Main slides | Appendix / evidence | Draft status |
|---|---|---|---|
| 1. Focus and justified assumptions | 2–3 | A1; `Scope.md`; explicit exclusive period end, fixed owner/rates, miles, boundary readings, integer pence and exclusions | Covered |
| 2. Three important modelled processes | 4–6 | Complete EPCs on A2–A7; editable TikZ sources, notation legend, state/activity alternation, roles and XOR | Covered |
| 2. Process 1: declaration and advance | 4 | A2 validation/rejection; A3 advance receipt and recording | Covered |
| 2. Process 2: MOT verification and settlement | 5, 9 | A4 evidence/assessment; A5 additional/no-adjustment/refund paths, invoice versus receipt and incomplete case 5 | Covered |
| 2. Aggregated information for management | 6, 10–11 | A6 quality/withholding; A7 release and planning decision; actual query meanings | Covered |
| 3. Conceptual ER model covering processes | 7 | A8 full entity/attribute/relationship view; A9 endpoint cardinalities, optional assessment and two inspection roles; declared lecture-notation extension | Covered |
| 3. Mapping to relational model | 8 | A10–A11 complete dictionary; A12–A14 actual CREATE statements | Covered |
| 4. Relational SQLite implementation | 8–9 | Six tables in `database/electromobility.db`; schema/constraint evidence A10–A14; read-only metadata and in-memory replay | Covered |
| 4. Five cases for **one** modelled process | 9 | A15–A17: five Process 2 settlements across 38 linked records; all outcomes and unpaid fifth case | Covered |
| 5. Analysis 1: meaningful planning question, at least two tables | 10 | A18 complete unchanged `expected_revenue.sql`, actual result and meaning; declarations JOIN vehicles | Covered |
| 5. Analysis 2: different useful question, at least two tables | 11 | A19 complete unchanged `additional_tax.sql`; A20 actual result and meaning; declarations JOIN tax_assessments | Covered |
| 5. Results interpreted correctly | 10–11, 17, 19 | A1, A16, A20–A21 distinguish estimated liability, assessment, net cash and receivable; aggregate payments before joining | Covered |
| 6. Exactly three growth risks | 13–15 | Peak/reporting load; inconsistent shared data; personal/financial exposure | Covered |
| 6. Three corresponding architecture principles | 12–15 | Workload separation/resilience; authoritative ownership/versioned interfaces; minimisation/least privilege | Covered |
| 6. Concrete practical effects, decision and trade-off/target measure per chain | 13–15 | Snapshot/capacity/recovery/retry test; data contracts/duplicate-order tests; role restrictions/retention/access reviews | Covered, explicitly proposed |
| 6. Business/IT and current-to-target transition | 12 | Current local scripts/SQLite versus proposed actors, operational processing/data, reporting and cross-cutting controls | Covered |
| 7. Approximately 2–3 reflection slides | 16–18 | Exactly three reflection slides; source/attribution A23 | Covered |
| 7a. Actual AI use and reasons | 16 | Prior assistance from supplied brief; this session's actual work in A23 | Covered |
| 7a. Deliberate non-use and reasons | 16 | Narrow **AUTHOR CONFIRMATION REQUIRED** statement; `author_review.md` item 1 | Personal information unresolved |
| 7b. Concrete unsound proposal, correction and detection | 17 | D3's original outstanding-amount label versus actual gross-adjustment query; £120 assessed versus £30 outstanding; Codex metadata plus documented context support AI-assisted provenance | Covered; correction attributed to agent |
| 7c. Validation and course-specific knowledge | 18 | EPC rules, cardinalities/constraints, database checks, mileage/rounding and payment reconciliation; verification JSON | Agent checks covered; author's own checks need confirmation |
| 7d. Exclusively personal design decisions and evidence | 18 | Explicitly distinguishes documented preferences from independent design ownership; `author_review.md` item 3 | Personal information unresolved |

The content is complete to the extent supported by available evidence. The marked personal statements are deliberately not fabricated and must be resolved before final submission.

## Additional presentation evidence

| Topic | Location |
|---|---|
| Case rates and responsibility of owner, MOT centre, DVLA and authority | Slide 2; A1 |
| No live DVLA integration or DVLA table | Slides 2, 8, 12 |
| Integer pence, half-up rounding once, exclusive boundary | Slide 3; A1 |
| Five business cases and unpaid PHEV worked example | Slide 9; A15–A17 |
| Same inspection can close one period and open the next | Slide 7; A9 |
| What constraints do and do not enforce | Slide 8; A9–A14 |
| Dates/timestamps really stored as TEXT | Slide 8; A10–A14 |
| An assessment is not a receipt; positive refunds must be subtracted | Slides 5, 11, 17; A1, A16, A20–A21 |
| No inference of national revenue from fictional cases | Slide 9 and its notes |
| Complete readable SQL statements and outputs | A18–A20; supplementary cash check A21 |
| Course and project references; actual AI attribution | References adjacent to content; A22–A23 |
| Original model preservation and documented corrections | `assets/README.md`; presentation-specific editable TikZ files |

## Source basis

The assignment and relevant course files were found locally in `C:\Users\mathi\Downloads` and inspected. The deck does **not** rely only on the supplied prompt's summary. References use PDF page positions:

- `Cases-IKT-HS2026.pdf`, pp. 1–4: formal deliverables, case and Tasks 1–7.
- `VL01 Einführung und Modellierung.pdf`, p. 54.
- `IKT-2026-VL02.pdf`, pp. 21–25.
- `EPC cheat sheet.pdf`, p. 1, visually inspected because some text extraction is encoded incorrectly.
- `05-VL03-Datenmodellierung-2026.pdf`, p. 15 and pp. 26–31; p. 28 visually inspected.
- `VL04 Datenbanken und BI 2026.pdf`, pp. 15–18, 48–49.
- `VL05 Architektur und Integration.pdf`, pp. 12, 15–16.
- `VL06 IT-Strategie und Enterprise Transformation.pdf`, p. 18.

Project baseline: current clean working tree at **`a2d2b2a`**, not the older commit assumed in the supplied prompt. Actual schema and sample results matched the prompt's numerical baseline. Obsolete README paths and the empty query placeholder were not used as implementation evidence.

## Verification record

Database evidence is reproducible with `python presentation/assets/verify_database.py` from the repository root:

- Database opened read-only (`mode=ro`, `query_only`) and hashed before/after.
- `PRAGMA integrity_check`: **ok**; `PRAGMA foreign_key_check`: **no violations**.
- Table/column, FK and unique-index metadata inspected. Actual CREATE statements and sample inserts replayed only in an in-memory database, matching all 38 rows and the schema.
- Both required query files executed unchanged, with outputs shown on slides 10–11 / A18–A20.
- Every case checked for same-vehicle boundary readings, chronology/non-decreasing miles, fixed case rate, half-up integer-pence arithmetic and advance paid.
- Supplementary cash SQL executed with per-declaration aggregation. Total final liability **123,000 pence**, net cash **120,000 pence**, remaining **3,000 pence**.
- These checks validate the current sample, not all possible inputs or missing schema-level business controls.

Build and visual review passed: all 42 final pages were rendered and inspected, with no overfull boxes, compilation warnings, off-page text or detected text collisions. The 19 script titles match the PDF. The shareable and preview PDFs are identical, and the final diff contains only presentation-related files. Detailed evidence is in `verification.md`.
