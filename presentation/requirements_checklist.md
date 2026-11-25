# Requirements and evidence checklist

This checklist describes the existing six-table English review deck. The database now implements the [13-table ER model](../diagrams/er_diagram/ikt-proposed-er-diagram.drawio); its current checks are in [verification.md](verification.md).

## Deliverable and numbering

- **English review draft:** `final_presentation.tex` and included `.tex` files are the master. `export_pptx.py` rebuilds it and exports `final_presentation.pptx`; the ignored PDF is a preview.
- **19 main slides with English notes + 24 unnarrated appendices = 43 slides.** Appendix **A*n*** is PowerPoint slide **19 + *n*** (A1 = 20, A24 = 43). There is no recorded voice-over.
- `speaker_notes_en.md` follows the 19 main titles. Its 1,289 words have a **13:15** slide budget. Rehearse the final German script and time the actual recording.
- **Not the final submission:** German voice-over PowerPoint, personal narration, author-confirmed reflection, the separate HSG AI declaration and separate database upload remain required. See `author_review.md`.

## Mandatory Tasks 1–7

| Requirement | Main slides | Appendix / evidence | Draft status |
|---|---|---|---|
| 1. Focus and justified assumptions | 2–3 | A1; `Scope.md`; exclusive period end, liable owner per segment, fixed case rates, verified miles and integer pence | Covered |
| 2. Three important modelled processes | 4–6 | Complete EPCs on A2–A7 and handover detail A24; editable TikZ sources, notation legend, state/activity alternation, roles and XOR | Covered |
| 2. Process 1: declaration and advance | 4 | A2 validation of period/vehicle/liable owner or correction; A3 advance due and receipt | Covered |
| 2. Process 2: Mileage verification and settlement | 5, 9 | A24 handover/review and A4 evidence/assessment; A5 additional/no-adjustment/refund paths, invoice versus receipt and incomplete case 5 | Covered |
| 2. Aggregated information for management | 6, 10–11 | A6 quality/withholding; A7 release and planning decision; actual query meanings | Covered |
| 3. Conceptual ER model covering processes | 7 | A8 full entity/attribute/relationship view; A9 endpoint cardinalities, optional assessment and two reading roles; declared lecture-notation extension | Covered |
| 3. Mapping to relational model | 8 | A10–A11 complete dictionary; A12–A14 actual CREATE statements | Covered |
| 4. Relational SQLite implementation | 8–9 | Six tables in `database/electromobility.db`; schema/constraint evidence A10–A14; read-only metadata and fresh-file replay | Covered |
| 4. Five cases for **one** modelled process | 9 | A15–A17: five Process 2 settlements across 36 linked records; all outcomes and unpaid fifth case | Covered |
| 5. Analysis 1: meaningful planning question, at least two tables | 10 | A18 complete `expected_revenue.sql`, actual result and meaning; declarations, vehicles, assessments and readings | Covered |
| 5. Analysis 2: different useful question, at least two tables | 11 | A19 complete `additional_tax.sql`; A20 actual result and meaning; declarations JOIN tax_assessments | Covered |
| 5. Results interpreted correctly | 10–11, 17, 19 | A1, A16, A20–A21 distinguish estimated liability, assessment, net cash and receivable; aggregate payments before joining | Covered |
| 6. Exactly three growth risks | 13–15 | Peak/reporting load; inconsistent shared data; personal/financial exposure | Covered |
| 6. Three corresponding architecture principles | 12–15 | Workload separation/resilience; authoritative ownership/versioned interfaces; minimisation/least privilege | Covered |
| 6. Concrete practical effects, decision and trade-off/target measure per chain | 13–15 | Snapshot/capacity/recovery/retry test; data contracts/duplicate-order tests; role restrictions/retention/access reviews | Covered, explicitly proposed |
| 6. Business/IT and current-to-target transition | 12 | Current local scripts/SQLite versus proposed actors, operational processing/data, reporting and cross-cutting controls | Covered |
| 7. Approximately 2–3 reflection slides | 16–18 | Exactly three reflection slides; source/attribution A23 | Covered |
| 7a. Actual AI use and reasons | 16 | Prior assistance from supplied brief; post-meeting work in A23 | Documented; author to confirm |
| 7a. Deliberate non-use and reasons | 16 | **AUTHOR INPUT REQUIRED**; `author_review.md`, 7a | Personal information unresolved |
| 7b. Concrete unsound proposal, correction and detection | 17 | D3's original outstanding-amount label versus actual gross-adjustment query; £90 assessed versus £30 outstanding; Codex metadata plus documented context support AI-assisted provenance | Covered; correction attributed to agent |
| 7c. Validation and course-specific knowledge | 18 | EPC rules, cardinalities/constraints, database checks, mileage/rounding and payment reconciliation; verification JSON | Agent checks covered; author's own checks need confirmation |
| 7d. Exclusively personal design decisions and evidence | 18 | Specify the choice, where it is visible, and its evidence (or none); `author_review.md`, 7d | Personal information unresolved |

The content is complete to the extent supported by available evidence. The marked personal statements are deliberately not fabricated and must be resolved before final submission.

## Additional presentation evidence

| Topic | Location |
|---|---|
| Case rates and responsibility of owner, MOT centre, DVLA and authority | Slide 2; A1 |
| No live DVLA integration or DVLA table | Slides 2, 8, 12 |
| Integer pence, half-up rounding once, exclusive boundary | Slide 3; A1 |
| Five business cases and shared BEV worked example and unpaid PHEV | Slide 9; A15–A17 |
| Current versus liable owner; one reading can close one segment and open the next | Slides 3, 7–8; A8–A10, A12–A13 |
| What constraints do and do not enforce | Slide 8; A9–A14 |
| Dates/timestamps really stored as TEXT | Slide 8; A10–A14 |
| An assessment is not a receipt; positive refunds must be subtracted | Slides 5, 11, 17; A1, A16, A20–A21 |
| No inference of national revenue from fictional cases | Slide 9 and its notes |
| Complete readable SQL statements and outputs | A18–A20; supplementary cash check A21 |
| Course and project references; actual AI attribution | References adjacent to content; A22–A23 |
| Editable models and traceable correction | `diagrams/`, root combined drawing and `assets/*.tex`; original reporting wording at `bab8c0f` |

## Source basis

The post-meeting review checked the actual `Cases-IKT-HS2026.pdf` (Downloads), pp. 1–4. The lecture references below are those recorded by the earlier English draft and retained in A22. Numbers are PDF positions:

- `Cases-IKT-HS2026.pdf`, pp. 1–4: formal deliverables, case and Tasks 1–7.
- `VL01 Einführung und Modellierung.pdf`, p. 54.
- `IKT-2026-VL02.pdf`, pp. 21–25.
- `EPC cheat sheet.pdf`, p. 1, visually inspected because some text extraction is encoded incorrectly.
- `05-VL03-Datenmodellierung-2026.pdf`, p. 15 and pp. 26–31; p. 28 visually inspected.
- `VL04 Datenbanken und BI 2026.pdf`, pp. 15–18, 48–49.
- `VL05 Architektur und Integration.pdf`, pp. 12, 15–16.
- `VL06 IT-Strategie und Enterprise Transformation.pdf`, p. 18.

## Verification record

See [verification.md](verification.md) for commands, both dated forecasts, cash reconciliation, validation limits and build checks. The [evidence JSON](assets/database_verification.json) records the executable results. Gross adjustments and net cash stay distinct; all five settlements belong to 2028/29. Personal reflection, translation, recording and submission remain the author’s responsibility.
