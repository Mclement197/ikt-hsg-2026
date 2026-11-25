# Database verification · expanded ER model

From the repository root:

```sh
python scripts/queries.py
python presentation/assets/verify_database.py
```

The verifier opens the deliverable read-only, compares its tables, columns, keys and nullability with `ikt-proposed-er-diagram.drawio`, and compares its entire SQLite dump with a fresh build. **13 tables, 18 cross-table foreign keys and 3 revision links**. Integrity check: `ok`; foreign-key violations: zero. The prior six-table database is backed up locally at `presentation/build/pre-expanded-er.db`.

| 2028/29 | BEVs (2 distinct) | PHEVs (2 distinct) | Total |
|---|---:|---:|---:|
| 3 January: one assessment and four open estimates | £630 | £270 | £900 |
| 4 April: five assessments | £660 | £330 | £990 |
| Final miles | 22,000 | 22,000 | 44,000 |

January uses a disposable replay stopped before annual evidence or receipts exist. Advancing the reporting date on that incomplete fixture yields two closed unassessed segments per type and NULL forecasts. These are checks on known fixture states, not arbitrary historical reporting.

**Accounts.** Five owners, four vehicles, two vehicle types, five ownership periods, one year, two rates, five cases, five declarations, four centres, nine readings, five issued assessments, eight posted payments and eight allocations. Original advances due and received £1,020; gross adjustments £90 extra and £120 refunded. Additional receipts £60. All cash is allocated in the official sample. Balances for Alice through Emma: £0, £0, £0, £0, £30. **£990 assessed = £960 net cash + £30 outstanding.**

**Transfer and negative checks.** Alice's original end, estimate, owner and £300 receipt survive closure. Ben's declaration starts at the shared 26,000-mile reading. Both 6,000-mile intervals fit the vehicle's 12,000-mile total. Before Alice's refund payment her balance is −£120 even though Ben is already registered. Disposable mutations exercise protected declaration fields, improper closure, overlap, wrong-vehicle evidence, decreasing mileage and impossible dates. Integer half-penny arithmetic is checked per assessment. [Machine-readable results](assets/database_verification.json).

**Revisions.** In a single transaction, mark the previous accepted/issued version `SUPERSEDED`, then post its successor with the `supersedes_*` link. Drafts do not displace final records. The verifier corrects a PHEV reading on a copy: the old decision still uses the original reading; reissue must use the corrected evidence. For 10,001 PHEV miles the new liability is 15,002p. Gross adjustments still use the original accepted demand, even when an estimate is revised.

**Cash.** A disposable £9 bank receipt is allocated £1 and £2 to one case and £4 to the same owner's next-year case. The bank report shows £2 unallocated. A duplicate posting, an allocation to another owner and spending more than the available amount are rejected.

**Enforcement boundary.** SQLite enforces non-overlapping intervals, case identity, issued bounds, applicable rates and current evidence at decision time, posted cash immutability and allocation limits. The loader also checks current odometer order and the completed revision chains **before commit**. Direct SQL editors should enable `foreign_keys` and `recursive_triggers` on their connection and run `scripts.validation.validate(connection)` before committing a revision batch. Rows in `mot_centres` represent the authorised sources; this is not online authentication.

## Earlier six-table presentation

At the six-table review, the four editable EPC pages matched their combined-drawing copies, and the six logical ER attribute sets matched that database. The PDF review found no off-page text or potential text collisions across 43 pages. The appendix now draws its historical SQL examples from `assets/six_table_listings.txt`.

`uv run presentation/export_pptx.py` forces a fresh XeLaTeX build, renders every page at 2560 × 1440, then reopens the PowerPoint and compares slide order and editable notes. `uv run --no-project --with pymupdf==1.26.7 --with pillow python presentation/assets/review_pdf.py` renders review sheets and checks text bounds, titles, notes and six complete schema listings. The handover EPC detail is A24 (slide 43). Narration covers slides 1–19 only: 1,289 English words, 795 seconds budgeted (13:15). The final German recording still needs to be timed by the author.
