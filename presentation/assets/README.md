# Editable presentation assets

All diagrams are native TikZ, included by `../final_presentation.tex`; the compiled deck therefore contains vector shapes and selectable text. Edit English labels in the `.tex` files for the later German version. No raster image generator was used.

## Model sources

- `diagram_styles.tex`: restrained common styling; six-sided EPC events, rounded functions and entities, XOR connectors; explicit legends.
- `p1_overview.tex`, `p2_overview.tex`, `p3_overview.tex`: narrated explanation views on slides 4–6. Their omissions are labelled and the complete models are included in the appendix.
- `p1_validation.tex` / `p1_cash.tex`: complete Process 1 across A2–A3.
- `p2_assessment.tex` / `p2_branches.tex`: complete Process 2 across A4–A5.
- `p3_quality.tex` / `p3_release.tex`: complete Process 3 across A6–A7.
- `er_conceptual.tex`: six-entity conceptual model, condensed on slide 7 and full attributes on A8. `\erdetail` selects the attribute view. The dictionary maps the model to exact schema identifiers.
- `architecture.tex`: current local prototype and explicitly proposed target on slide 12.
- `appendix.tex`: A1–A23, including the complete models, dictionary, schema evidence, cases, SQL and real sources.

## Notation and presentation-specific corrections

The EPCs use state-based events, verb-based activities, event/function alternation, start/end events and exclusive choice after activities. Bracketed roles are annotations, not control-flow nodes. Repeated events at page boundaries are continuations of the same process instance. Overview contractions are explained on the associated slides. Modelled notifications, review, payment transfers and validation are not claims of implemented automation.

The lecture ER example on PDF page 28 of the locally supplied VL03 was visually inspected. Rounded entity boxes and `#`, `*`, `o` attribute markers follow that example. **Declared extension:** numerical endpoint ranges replace the example's line-style optionality and crow's feet. Lines have no arrow/direction semantics. An endpoint range describes how many entities at that endpoint can relate to one at the opposite endpoint. All conceptual attributes here are mandatory; `o` is explained but unused. Conceptual relationships become FKs in the implementation dictionary; the conceptual view does not duplicate them as FK attributes.

Corrections relative to the existing individual draw.io files:

1. Reporting outputs now name the implemented queries accurately: estimated advance liability by type/start year and gross settlement adjustments by start year. Outstanding cash is explicitly supplementary validation.
2. The reporting design proceeds to a planning decision and treats quality/review responsibilities as designed human activities, rather than implying a deployed reporting service.
3. The settlement model explicitly checks the pair of readings and distinguishes an issued invoice/authorised refund from a recorded transfer. Case 5 is an unfinished payment path. No stored invoice status is invented.
4. Dates/timestamps are labelled SQLite TEXT in the mapping. Cross-record rules are separated from enforced constraints. Numeric endpoint multiplicities explain the optional assessment and separate opening/closing reuse limits.
5. The tall original diagrams are split into readable landscape views. The root `eved_scope_and_processes.drawio` and original `diagrams/` files are preserved.

## Verification evidence

Run from the repository root:

```sh
python presentation/assets/verify_database.py
```

This uses only the Python standard library, opens the database with SQLite `mode=ro` plus `query_only`, inspects metadata/integrity/foreign keys, executes the actual queries, checks all five settlements with `Decimal(..., ROUND_HALF_UP)`, and compares the actual schema/sample inserts against an in-memory reconstruction. A before/after SHA-256 establishes that the database bytes were unchanged. Results are generated in `database_verification.json`. These are sample checks, not new application functionality or proof of production controls.

`outstanding_validation.sql` is the additional payment reconciliation on A21. It aggregates signed payments per declaration before joining assessments, avoiding duplicated liabilities. The two required SQL files are included directly from `database/queries/`; the essential CREATE statements are included directly from `scripts/setup_database.py`.

The build command remains:

```sh
cd presentation
latexmk -r build/latexmkrc final_presentation.tex
```

Preview/intermediates remain in `build/`; the shareable copy is `final_presentation.pdf`. The old `build/demo.bib` is an unused preserved support file; references are deliberately listed in A22–A23 rather than using a fabricated bibliography.

For repeatable page rendering and script/slide checks (temporary dependencies, without changing project dependencies):

```sh
uv run --no-project --with pymupdf --with pillow python presentation/assets/review_pdf.py
```

Run this command from the repository root. It renders all 42 pages, creates contact sheets and `pdf_review.json` in ignored `presentation/build/review/`, checks text bounds and possible text collisions, and verifies the 19 script titles against the PDF. It does not replace visual inspection of shapes, arrows and spacing.
