# Verification · 23 November 2026 English review draft

The post-meeting agent checked this working tree against the local **Cases-IKT-HS2026.pdf**, pp. 1–4, and the meeting brief. The starting commit on `main` was `bab8c0f`. The only pre-existing change was `presentation/final_presentation.pdf`; the exact local copy was backed up before building and is also available locally as `presentation/build/pre-meeting-local.pdf`. Slide content came from the LaTeX, diagrams, SQL and working database.

## Database and ownership

The original database was backed up. `scripts/setup_database.py` and `scripts/load_db.py` created a separate candidate with foreign keys enabled. The candidate passed `presentation/assets/verify_database.py` before replacing the deliverable; the verifier then ran again against `database/electromobility.db` to produce [database_verification.json](assets/database_verification.json).

| Check | Result |
|---|---|
| Integrity / `foreign_key_check` | `ok` / zero violations |
| Schema and sample replay | Six CREATE statements and all inserts reproduced the deliverable in memory |
| Records | 5 owners, 5 vehicles, 5 declarations, 10 inspections, 5 assessments, 8 payments. All 38 rows matched the original backup on every pre-existing column. |
| Period owner | Both owner columns are mandatory FKs to `vehicle_owners`. In the disposable replay, changing vehicle 5's registration from owner 5 to 2 left its assessed declaration liable to owner 5. No transfer case was added to the sample. |
| Settlement evidence | Five distinct assessed declarations. Both readings matched the vehicle and exact period dates; their difference was non-negative. Advance and final tax matched miles × rate with half-up penny rounding. |
| Checked database SHA-256 | `7301f099339e94dc5bf68ed3a695c55095b4c1e656295042e6794942e2dad6e1` (unchanged by read-only verification) |

### Actual outputs

`python scripts/queries.py` executed both original statements. The grouping year is the year the declaration period **starts**.

| Analysis 1: start year | Vehicle type | Distinct vehicles | Declared miles | Estimated advance liability |
|---|---|---:|---:|---:|
| 2028 | BEV | 3 | 30,000 | £900 |
| 2028 | PHEV | 2 | 18,000 | £270 |

| Analysis 2: start year | Assessed declarations | Additional cases | Refund cases | Gross additional tax assessed | Gross refunds assessed |
|---|---:|---:|---:|---:|---:|
| 2028 | 5 | 3 | 1 | £120 | £60 |

Analysis 2 compares final tax with advance **due**. The separate `assets/outstanding_validation.sql` was also run directly with SQLite: cases 1–4 returned £0 remaining; case 5 returned £180 final, £150 net cash, **£30 remaining**. Across the sample:

- Liability: £1,170 advance due + £120 additional assessed − £60 refunds assessed = **£1,230 final tax**.
- Cash: £1,170 advances received + £90 additional receipts − £60 refunds paid = **£1,200 net received**.
- Receivable: £1,230 − £1,200 = **£30**. Signed payments are summed per declaration before joining to assessments.

## Models, build and PowerPoint

- Parsed the editable draw.io XML: all three combined process pages matched their individual graphs. Their connected paths start/end with events, alternate events and role-labelled functions, and branch at XORs. P1 records period liability, P2 distinguishes authorisation from cash, and P3 reports the two SQL measures. The logical ER drawing's columns, SQLite types and eight FK relationships matched database metadata.
- Built with `latexmk -r build/latexmkrc final_presentation.tex` from `presentation/`. The first rendering check found appendix overflow. After shortening the affected text, `uv run presentation/export_pptx.py` forced a fresh build. The final XeLaTeX log had no overfull boxes, missing characters or LaTeX/package warnings. The two generated preview PDFs matched byte-for-byte.
- `assets/review_pdf.py` rendered all **42** final pages. The 19 main titles matched the notes, A1–A23 were in order, and all six appendix DDL ranges contained the full corresponding CREATE statements. No off-page text or potential inter-block text collisions were detected. All 11 contact sheets were visually inspected, including the revised ER, cardinalities and schema listings.
- The PowerPoint package reopened successfully. All **42 embedded 2560×1440 images** matched independent renders of the corresponding fresh PDF pages in order. All **19 main notes** matched the Markdown; there are no appendix notes or audio files.
- **Microsoft PowerPoint 16.0** opened the actual `.pptx` read-only and rendered all 42 slides at 1280×720. It reported a **960×540 pt (16:9)** slide size and the correct appendix order through A23. Its ER and detailed SQL renderings were also inspected. Local review outputs are under ignored `presentation/build/review/` and `presentation/build/review-office/`.

## Narration and author input

The 19 English sections cover Tasks 1–7 in **1,615 words** with a **795-second (13:15) budget**; assumptions get 25 seconds. At 130 words/minute plus 90 seconds for pauses, estimated delivery is **13:55**. This is not a recording or a measurement of German speech.

The earlier presentation agent identified the “outstanding amounts” error in the baseline reporting diagram. The post-meeting edits corrected both editable versions. The checks above are agent checks. [Author review](author_review.md) lists the remaining 7a, 7c and 7d personal evidence, German translation, own-voice recording and timing, official HSG AI declaration and separate database submission.
