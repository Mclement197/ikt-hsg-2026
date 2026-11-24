# /// script
# requires-python = ">=3.11"
# dependencies = ["pymupdf==1.26.7", "python-pptx==1.0.2"]
# ///
"""Run `uv run presentation/export_pptx.py` to rebuild and export the English deck."""
from io import BytesIO
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory

import pymupdf
from pptx import Presentation
from pptx.util import Inches

HERE = Path(__file__).resolve().parent
BUILD = HERE / "build"
PDF = BUILD / "final_presentation.pdf"
OUTPUT = HERE / "final_presentation.pptx"


def main():
    # -g reruns LaTeX even when latexmk finds no changed inputs. Read only the
    # build output from this successful run, never a pre-existing published PDF.
    previous = PDF.stat().st_mtime_ns if PDF.exists() else None
    subprocess.run(["latexmk", "-g", "-r", "build/latexmkrc", "final_presentation.tex"],
                   cwd=HERE, check=True)
    if not PDF.is_file() or PDF.stat().st_mtime_ns == previous:
        raise RuntimeError("LaTeX did not produce a fresh build/final_presentation.pdf")

    sections = (HERE / "speaker_notes_en.md").read_text(encoding="utf-8").split("\n## ")[1:]
    titles, notes = [], []
    for number, section in enumerate(sections, 1):
        header, body = section.strip().split("\n", 1)
        match = re.fullmatch(r"(\d+)\. (.+) — \d+ s", header)
        if not match or int(match[1]) != number:
            raise ValueError(f"Invalid speaker note heading: {header}")
        titles.append(match[2])
        notes.append(body.strip())
    appendix = (HERE / "assets/appendix.tex").read_text(encoding="utf-8")
    titles += re.findall(r"\\begin\{frame\}(?:\[fragile\])?\{(A\d+ \| [^{}]+)\}", appendix)
    if len(notes) != 19 or len(titles) != 42:
        raise ValueError("Expected 19 main slides followed by A1–A23")

    deck = Presentation()
    deck.slide_width, deck.slide_height = Inches(40 / 3), Inches(7.5)
    deck.core_properties.title = titles[0]
    deck.core_properties.author = "Mathis Clément"
    deck.core_properties.subject = "Case A · English review draft"
    with pymupdf.open(PDF) as pdf:
        if len(pdf) != len(titles):
            raise ValueError("Fresh PDF does not match the slide and notes count")
        for i, (page, title) in enumerate(zip(pdf, titles, strict=True)):
            text = " ".join(page.get_text().split())
            w, h = page.rect.width, page.rect.height
            if title not in text or abs(w / h - 16 / 9) > .001:
                raise ValueError(f"Unexpected title, order or aspect ratio on page {i + 1}: {title}")
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2560 / w, 1440 / h), alpha=False)
            slide = deck.slides.add_slide(deck.slide_layouts[6])  # blank layout
            image = slide.shapes.add_picture(BytesIO(pix.tobytes("png")), 0, 0,
                                             width=deck.slide_width, height=deck.slide_height)
            image.name = title
            if i < len(notes):
                slide.notes_slide.notes_text_frame.text = notes[i]

    with TemporaryDirectory(dir=BUILD) as tmp:
        exported = Path(tmp) / OUTPUT.name
        deck.save(exported)
        reopened = Presentation(exported)
        if [s.shapes[0].name for s in reopened.slides] != titles:
            raise ValueError("Slide order did not survive PowerPoint export")
        if [s.notes_slide.notes_text_frame.text for s in list(reopened.slides)[:len(notes)]] != notes:
            raise ValueError("Speaker notes did not survive PowerPoint export")
        exported.replace(OUTPUT)
    print(f"{OUTPUT}: {len(titles)} widescreen slides, {len(notes)} sets of speaker notes")


if __name__ == "__main__":
    main()
