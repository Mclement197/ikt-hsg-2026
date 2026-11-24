"""Render every page and record bounded-text/title/script checks.

Presentation-only review helper; dependencies are kept out of the project:
uv run --no-project --with pymupdf --with pillow python presentation/assets/review_pdf.py
Rendered pages and contact sheets are generated under ignored presentation/build/.
Visual inspection is still required; this script cannot certify good layout.
"""
import json
import re
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

PRESENTATION = Path(__file__).resolve().parents[1]
OUT = PRESENTATION / "build/review"
OUT.mkdir(parents=True, exist_ok=True)
pdf = pymupdf.open(PRESENTATION / "final_presentation.pdf")
assert len(pdf) == 42, f"Unexpected page count: {len(pdf)}"
notes = (PRESENTATION / "speaker_notes_en.md").read_text(encoding="utf-8")
sections = re.split(r"^## ", notes, flags=re.M)[1:]
assert len(sections) == 19
words = sum(len(re.findall(r"\b[\w]+(?:[’'-][\w]+)*\b", section.split("\n", 1)[1]))
            for section in sections)
budgets = sum(int(re.search(r"— (\d+) s", section).group(1)) for section in sections)
assert budgets <= 15 * 60

# Check the appendix's six source ranges against the actual, complete CREATE
# statements, so an edit above a listing cannot silently shift its evidence.
setup = (PRESENTATION.parent / "scripts/setup_database.py").read_text(encoding="utf-8")
appendix = (PRESENTATION / "assets/appendix.tex").read_text(encoding="utf-8")
ranges = re.findall(r"firstline=(\d+),lastline=(\d+)\]\{\.\./scripts/setup_database\.py\}", appendix)
listed = ["\n".join(setup.splitlines()[int(start)-1:int(end)]) for start, end in ranges]
assert len(listed) == 6 and listed == re.findall(r"^CREATE TABLE .*?^\)$", setup, re.M | re.S)
text_pages, off_page, collisions = [], [], []
for number, page in enumerate(pdf, 1):
    page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(OUT / f"page-{number:02}.png")
    text = page.get_text()
    text_pages.append(text)
    assert "\ufffd" not in text, f"Replacement glyph on page {number}"
    lines = []
    for bi, block in enumerate(page.get_text("dict")["blocks"]):
        for line in block.get("lines", []):
            value = "".join(span["text"] for span in line["spans"])
            rect = pymupdf.Rect(line["bbox"])
            if rect.x0 < -0.5 or rect.y0 < -0.5 or rect.x1 > page.rect.width + .5 or rect.y1 > page.rect.height + .5:
                off_page.append({"page": number, "text": value, "bbox": list(rect)})
            lines.append((bi, value, rect))
    for index, (bi, value, rect) in enumerate(lines):
        for bj, other, other_rect in lines[index+1:]:
            if bi == bj or not value.strip() or not other.strip():
                continue
            overlap = rect & other_rect
            if not overlap.is_empty and overlap.width > 2 and overlap.height > 2:
                if overlap.get_area() / min(rect.get_area(), other_rect.get_area()) > .12:
                    collisions.append({"page": number, "a": value, "b": other})

def normal(text):
    return re.sub(r"\s+", " ", text).strip()

for index, section in enumerate(sections):
    title = re.sub(r"^\d+\. | — \d+ s$", "", section.split("\n")[0])
    assert normal(title) in normal(text_pages[index]), (index + 1, title)
for index in range(19, 42):
    assert f"A{index-18} |" in text_pages[index]
for term in ("Matthias Vogelgesang", "Center for modern beamer themes", "lorem, ipsum",
             "Riemann Hypothesis", "Largest cities in the world", "knuth92"):
    assert term not in "\n".join(text_pages)
for number in (4, 6):
    assert "path;" in text_pages[number-1], "Overview qualification missing"
assert not off_page, off_page

for start in range(0, len(pdf), 4):
    sheet = Image.new("RGB", (1600, 950), "#dce4e5")
    draw = ImageDraw.Draw(sheet)
    for position, index in enumerate(range(start, min(start+4, len(pdf)))):
        image = Image.open(OUT / f"page-{index+1:02}.png")
        image.thumbnail((780, 440))
        x, y = 10+800*(position % 2), 25+475*(position // 2)
        sheet.paste(image, (x, y))
        draw.text((x, y-18), f"PDF page {index+1}", fill="black")
    sheet.save(OUT / f"sheet-{start+1:02}-{min(start+4,len(pdf)):02}.png")

report = {"pages": len(pdf), "main_slides": 19, "appendix_slides": 23,
          "spoken_words": words, "budget_seconds": budgets,
          "off_page_text": off_page, "possible_text_collisions": collisions,
          "slide_note_titles_match": True,
          "six_complete_ddl_listings": True,
          "all_pages_rendered": True,
          "visual_inspection_required": True}
(OUT / "pdf_review.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
(OUT / "all_pages.txt").write_text("\n\n".join(
    f"PAGE {i}\n{text}" for i, text in enumerate(text_pages, 1)), encoding="utf-8")
print(json.dumps(report, indent=2))
