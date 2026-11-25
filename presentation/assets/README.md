# Editable presentation assets

All presentation diagrams are native TikZ, included by `../final_presentation.tex`; the fresh PDF has vector shapes and selectable text. PowerPoint uses rendered slide images plus editable speaker notes. Edit labels in the `.tex` files before exporting a later German version.

## Model sources (six-table review deck)

- `diagram_styles.tex`: restrained common styling; six-sided EPC events, rounded functions and entities, XOR connectors; explicit legends.
- `p1_overview.tex`, `p2_overview.tex`, `p3_overview.tex`: narrated explanation views on slides 4–6. Their omissions are labelled and the complete models are included in the appendix.
- `p1_validation.tex` / `p1_cash.tex`: complete Process 1 across A2–A3.
- `p2_assessment.tex` / `p2_branches.tex`: settlement on A4–A5; `p2_handover.tex` covers the handover decision and buyer interface on A24.
- `p3_quality.tex` / `p3_release.tex`: complete Process 3 across A6–A7.
- `er_conceptual.tex`: six-entity conceptual model, condensed on slide 7 and full attributes on A8. `\erdetail` selects the attribute view. The dictionary maps the model to exact schema identifiers.
- `architecture.tex`: current local prototype and explicitly proposed target on slide 12.
- `appendix.tex`: A1–A24, including the complete models, dictionary, schema evidence, cases, SQL and real sources.

## Notation and presentation-specific corrections

The EPCs use state-based events, verb-based activities, event/function alternation, start/end events and exclusive choice after activities. Bracketed roles are annotations, not control-flow nodes. Repeated events at page boundaries are continuations of the same process instance. Overview contractions are explained on the associated slides. Modelled notifications, review, payment transfers and validation are not claims of implemented automation.

Rounded entity boxes and `#`, `*`, `o` attribute markers follow the VL03 example (PDF p. 28). **Declared extension:** numerical endpoint ranges replace the example's line-style optionality and crow's feet. Lines are non-directional. An endpoint range describes how many entities at that endpoint can relate to one at the opposite endpoint. All conceptual attributes here are mandatory; `o` is explained but unused. Conceptual relationships become FKs in the implementation dictionary.

## How the editable models correspond

- P1 identifies the liable owner for the period. In the ER drawing the owner's two relationships are **current registration** and **period liability**. A later registration update leaves the declaration's owner and assessment unchanged.
- P2 checks both readings and separates an invoice/authorised refund from recorded cash. Case 5 is an unfinished payment path. Invoice status is a modelled event, not a database column.
- P3 ends in a planning decision. Both the individual and combined draw.io pages show expected final tax by type/billing year and gross assessed adjustments by billing year. Outstanding cash needs separate signed-payment data.
- The tall editable process pages in `diagrams/business_processes/` are also present in the root combined `.drawio`. The database has since moved to `diagrams/er_diagram/ikt-proposed-er-diagram.drawio` (13 tables); `schema.dot` and `schema.svg` show its foreign keys.
- To inspect the **historical** AI error in its original context: `git show bab8c0f:diagrams/business_processes/03_management_reporting.drawio` (cell `queriesbody`). Compare with `database/queries/additional_tax.sql`, which has no payments join.

## Verification evidence

Run from the repository root:

```sh
python presentation/assets/verify_database.py
```

This read-only check compares all rows and the schema with a fresh temporary build. It checks the January forecast, pending seller refund after registration, shared mileage, half-up arithmetic and invalid inputs on disposable fixtures. Results are in `database_verification.json`.

`outstanding_validation.sql` reconciles the current database by tax case, using signed allocations. `six_table_listings.txt` preserves the earlier SQL examples printed in the English review deck, so rebuilding those slides does not mix two different schemas. The executable reports for the new model are listed in the [README](../../README.md).

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

Run this from the repository root after building. It renders all 43 pages, makes contact sheets and `pdf_review.json` in ignored `presentation/build/review/`, checks text bounds/collisions, notes and timing, and checks all six appendix listing ranges against the complete CREATE statements. Inspect shapes, arrows and spacing visually as well.
