# ikt-hsg-2026

## Project - Case A (Electromobility)

Design an IT system that allows the UK government to tax electric vehicules based on the distance they drive
- Standard gas powered vehicules contribute in the same way because they pay a tax on gas, electric vehicules dont
Therefore the following rates apply:
- Fully electric vehicule: 3 pence/mile 
- Plug-in hybrid vehicule: 1.5 pence/mile

The following structure must be implemented:
1. Vehicule owners: give an estimate of their annual mileage 
2. Tax authority: calculates tax and collects payment
3. MOT inspection: records the actual odometer of the vehicule 
4. issues additional tax or refund
This means that the system must coordinate vehicule owners, MOT inspections, the DVLA and tax authorities while protecting personal data

### What needs to be built
| Task | What is to be done |
| -------- | ------- |
| scope and assumptions | explain the system that I will be designing |
| Business processes | Model three processes, including one for management reporting |
| Data modelling | Create an Entity-Relationship (ER) diagram |
| Database | Implement your relational database and insert five business transactions |
| SQL analysis | Create two meaningful SQL queries, each involving at least two tables |
| Enterprise architecture | Explain three risks, three corresponding architecture principles and their practical effects |
| AI reflection | Explain and critically evaluate your use of AI, including a concrete error you corrected |

#### Three business processes
Three business processes:
1. Annual mileage declaration and advance payment: How owners register their estimated mileage and pay the preliminary tax.
2. MOT verification and final settlement: How authorities verify the driven distance, calculate the final liability and issue refunds or additional invoices.
3. Management reporting: How authorities aggregate mileage, payments and outstanding liabilities to forecast tax revenue and support decisions.

#### Database tables

| Table | Information |
|---|---|
| `vehicle_owners` | Vehicle owner details |
| `vehicles` | Vehicle type and tax rate |
| `declarations` | Estimated annual mileage |
| `mot_inspections` | Recorded odometer readings |
| `payments` | Advance payments and adjustments |
| `tax_assessments` | Final tax liabilities and balances |






Base structure:

```text
ikt-hsg-2026/
│
├── .vscode/                 # LaTeX Workshop configuration
│
├── database/
│   ├── schema.sql
│   ├── sample_data.sql
│   ├── queries.sql
│   └── electromobility.db
│
├── diagrams/
│   ├── business_processes/
│   └── er_diagram/
│
├── presentation/
│   ├── final_presentation.tex
│   ├── final_presentation.pdf
│   └── build/              # Build configuration, bibliography, and generated files
│
├── scripts/
│   └── setup_database.py
│
└── README.md
```

## LaTeX presentation

1. Open the **repository root (`ikt-hsg-2026`)** in VS Code so that `.vscode/settings.json` is loaded.
2. Open `presentation/final_presentation.tex`. LaTeX files auto-save after one second; LaTeX Workshop rebuilds on changes and refreshes the PDF preview.
3. Press **Ctrl+Alt+V** from the LaTeX source to open the side-by-side LaTeX Workshop PDF preview. **Double-click text in that preview** to jump to the corresponding source. **Ctrl+Alt+J** jumps from the source to the PDF.
4. Use `presentation/final_presentation.pdf` for presenting or sharing. Each build updates this copy automatically.

The editing preview uses `presentation/build/final_presentation.pdf`, beside its SyncTeX mapping. Open it through **Ctrl+Alt+V** for PDF-to-source navigation. All intermediate files, logs, and SyncTeX data stay in `presentation/build/`. The template's example references are in `build/demo.bib`; the build settings are in `build/latexmkrc`. These two support files are versioned; generated build files are ignored by Git.

### Build from a terminal

Requires a LaTeX distribution with XeLaTeX, BibTeX, the Metropolis packages and Fira fonts, plus Perl and latexmk 4.87 or newer. These tools and LaTeX Workshop are already installed on the current Windows setup.

From `presentation/`, build once:

```sh
latexmk -r build/latexmkrc final_presentation.tex
```

To rebuild automatically on saved changes outside VS Code (stop with Ctrl+C):

```sh
latexmk -r build/latexmkrc -pvc -view=none final_presentation.tex
```

LaTeX Workshop handles watching while editing in VS Code. **Ctrl+Alt+B** also starts a build manually.
