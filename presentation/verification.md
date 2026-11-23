# Verification — English presentation draft

Completed on **9 November 2026** by the presentation agent, against the working tree based on commit `a2d2b2a`.

## Build and visual review

- Built successfully with the existing command, from `presentation/`:

  ```sh
  latexmk -r build/latexmkrc final_presentation.tex
  ```

- Final XeLaTeX log: **no compilation errors, LaTeX/package warnings, missing-character messages or overfull boxes**.
- The shareable `final_presentation.pdf` and editor-preview `build/final_presentation.pdf` are byte-identical. SyncTeX was generated in `build/`. Build configuration and editor settings are unchanged.
- Final PDF: **42 widescreen pages**, comprising **19 narrated slides and A1–A23**. No extra notes pages, overlay duplicates, template demonstration slides, sample author or dummy references remain.
- **Every final PDF page was rendered and visually inspected.** Detailed diagram pages were also inspected individually. Revisions corrected overlapping EPC nodes, cramped ER attributes, table/prose spacing, hidden overview qualifications, the architecture labels and SQL overflow.
- Native TikZ shapes/labels are vector content. Complete EPC models are split over paired appendix pages rather than reduced to tiny tall diagrams. Conceptual ER notation includes an explicit extension legend.
- Automated text review found **no off-page text or potential inter-block text collisions**. This supplemented the visual review; it did not substitute for inspection of shapes and arrows.
- Generated review images, contact sheets, extracted text and machine-readable results are in ignored `build/review/`. Recreate them with `assets/review_pdf.py` as documented in `assets/README.md`.

## Data and numerical checks

`assets/verify_database.py` opened the committed database in read-only mode, inspected schema metadata and executed the real SQL files. It also rebuilt the actual schema and inserts in memory and compared all records.

| Check | Result |
|---|---|
| SQLite integrity | `ok` |
| Foreign-key violations | None |
| Row counts | 5 owners, 5 vehicles, 5 declarations, 10 inspections, 5 assessments, 8 payments = 38 |
| Actual schema and inserts replayed in memory | Matched committed schema and rows |
| Analysis 1 | BEV: 3 vehicles, 30,000 miles, £900; PHEV: 2 vehicles, 18,000 miles, £270 |
| Analysis 2 | 5 assessed declarations; 3 additional cases; 1 refund case; £120 extra tax assessed; £60 refunds assessed |
| Advances due and received | £1,170 |
| Final assessed liability | £1,230 |
| Additional receipts / refunds paid | £90 / £60 |
| Net cash / remaining balance | £1,200 / £30 |
| Database preserved | Byte-identical to both the starting checksum and `HEAD` |

Database SHA-256:

```text
e0c910ad63a5d846cd105e4b0452946477cadfc1bf9f01e6938f4f491e2ee26f
```

All five cases were checked for vehicle consistency, exact period-boundary readings, increasing dates/non-decreasing mileage, actual miles, the fixed case rates, half-up pence calculations and signed payments. The additional cash SQL aggregates payments per declaration before joining assessments. Full metadata, case records, query outputs and totals are retained in `assets/database_verification.json`.

These are checks of the supplied demonstration data. They do not imply that omitted business validations, tax automation, real payments, agency integrations or production controls have been implemented.

## Coverage, narration and provenance

- `requirements_checklist.md` maps all seven tasks, including 7a–7d, to exact slide/appendix numbers and evidence.
- Counted **three EPC models**, **five Process 2 cases**, **two required multi-table SQL analyses**, **three numbered architecture risk/principle/effect chains** and **three reflection slides**.
- The 19 script titles and their numbers were checked against the final PDF. Speaker notes contain **1,703 spoken words**; slide budgets total **820 seconds**.
- Estimated delivery is **13:40** at 140 words/minute plus about 90 seconds for diagram pointing and pauses. At 130 words/minute with the same pauses it is about **14:36**. No recording was generated or timed; German delivery must be rehearsed separately.
- The actual assignment and relevant course PDFs were inspected locally; the VL03 ER example and EPC cheat sheet were visually read. Source IDs and PDF page positions are included in A22–A23 and near the relevant content.
- The reporting-label error is evidenced by the existing drawing and actual query. AI-assisted provenance is supported by the drawing's `agent="Codex"` metadata and the supplied context. The correction and checks are attributed to this presentation agent, not to an invented independent student discovery.
- Only presentation-related files changed. Application scripts, source SQL, original model files, the database, `.vscode/settings.json` and `presentation/build/latexmkrc` were preserved. No commit, push, pull request or external submission was made.

## Remaining author work

The English draft is complete for substantive review. Three specifically personal items remain: deliberate AI non-use and its reason, checks personally repeated, and exclusively personal design decisions with evidence. They are flagged on slides 16/18 and in `author_review.md`, which also lists German translation, PowerPoint preparation, own-voice narration, HSG AI declaration and separate database upload.
