# Editable presentation assets

All presentation diagrams are native TikZ, included by `../final_presentation.tex`; the fresh PDF has vector shapes and selectable text. PowerPoint uses rendered slide images plus editable speaker notes. Edit labels in the `.tex` files before exporting a later German version.

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

Rounded entity boxes and `#`, `*`, `o` attribute markers follow the VL03 example (PDF p. 28). **Declared extension:** numerical endpoint ranges replace the example's line-style optionality and crow's feet. Lines are non-directional. An endpoint range describes how many entities at that endpoint can relate to one at the opposite endpoint. All conceptual attributes here are mandatory; `o` is explained but unused. Conceptual relationships become FKs in the implementation dictionary.

## How the editable models correspond

- P1 identifies the liable owner for the period. In the ER drawing the owner's two relationships are **current registration** and **period liability**. A later registration update leaves the declaration's owner and assessment unchanged.
- P2 checks both readings and separates an invoice/authorised refund from recorded cash. Case 5 is an unfinished payment path. Invoice status is a modelled event, not a database column.
- P3 ends in a planning decision. Both the individual and combined draw.io pages show advance liability by type/start year and gross assessed adjustments by start year. Outstanding cash needs separate signed-payment data.
- The tall editable process pages in `diagrams/business_processes/` are also present in the root combined `.drawio`. A2–A7 present the same full paths as six landscape panels. `diagrams/er_diagram/eved_er_diagram.drawio` is the editable logical model; `schema.dot` and `schema.svg` are FK views regenerated from SQLite metadata using `scripts/sqlite-schema-diagram.sql` and Graphviz.
- To inspect the **historical** AI error in its original context: `git show bab8c0f:diagrams/business_processes/03_management_reporting.drawio` (cell `queriesbody`). Compare with `database/queries/additional_tax.sql`, which has no payments join.

## Verification evidence

Run from the repository root:

```sh
python presentation/assets/verify_database.py
```

This uses only the Python standard library, opens the database with SQLite `mode=ro` plus `query_only`, checks the five cases and actual query results, recalculates pence with `ROUND_HALF_UP`, and compares every row and table definition with an in-memory replay. It changes a current owner **only in that replay** to check the historical link. The before/after SHA-256 refers to the read-only check of the **new** deliverable. Results are in `database_verification.json`.

`outstanding_validation.sql` is the additional payment reconciliation on A21. It aggregates signed payments per declaration before joining assessments, avoiding duplicated liabilities. The two required SQL files are included directly from `database/queries/`; the essential CREATE statements are included directly from `scripts/setup_database.py`.

The build command remains:

```sh
cd presentation
latexmk -r build/latexmkrc final_presentation.tex
```

The generated preview is `final_presentation.pdf`; `build/` holds intermediates. From the repo root, `uv run presentation/export_pptx.py` forces a new build before exporting every slide. See the [README](../../README.md) for recording and hand-in. `build/demo.bib` is a preserved support file; references are on A22–A23.

For repeatable page rendering and script/slide checks (temporary dependencies, without changing project dependencies):

```sh
uv run --no-project --with pymupdf==1.26.7 --with pillow python presentation/assets/review_pdf.py
```

Run this from the repository root after building. It renders all 42 pages, makes contact sheets and `pdf_review.json` in ignored `presentation/build/review/`, checks text bounds/collisions, notes and timing, and checks all six appendix listing ranges against the complete CREATE statements. Inspect shapes, arrows and spacing visually as well.
