"""Extract the photographs used on the site from the client's catalogue PDFs.

Writes scraped/catalogue/<name>.png (git-ignored); then run  node web/scripts/export-catalogue.mjs
to make the web versions (public/media/cat-<name>.webp).
Needs PyMuPDF:  pip install pymupdf     Usage (from the repo root):  python scripts/extract_catalogue.py
"""
import pathlib
import pymupdf

MEDIA = pathlib.Path("scraped/media")
OUT = pathlib.Path("scraped/catalogue")
FOLDER = {
    "AQUILO-CATALOGUE-2022-2023.pdf": "2022/08",
    "AQUILO-Catalogue-ENG-Latest_compressed.pdf": "2023/07",
    "Aquilo-Welness-Catalogue_compressed.pdf": "2023/07",
    "wellness-2024-final-catalogue.pdf": "2024/08"
}

# name -> (catalogue PDF, image xref inside it)
PICKS = {
    "finishes": ("AQUILO-CATALOGUE-2022-2023.pdf", 90),  # page 1, 2481x1868
    "copper-wall-pour": ("AQUILO-CATALOGUE-2022-2023.pdf", 277),  # page 8, 1234x1210
    "gold-pour": ("AQUILO-CATALOGUE-2022-2023.pdf", 293),  # page 9, 1116x1385
    "dark-suite": ("AQUILO-CATALOGUE-2022-2023.pdf", 580),  # page 19, 2482x1561
    "marble-pedestal": ("AQUILO-CATALOGUE-2022-2023.pdf", 828),  # page 28, 1104x1748
    "chrome-stream": ("AQUILO-CATALOGUE-2022-2023.pdf", 1338),  # page 45, 1211x1006
    "black-vessel": ("AQUILO-CATALOGUE-2022-2023.pdf", 1868),  # page 64, 1244x874
    "white-basin-dark": ("AQUILO-CATALOGUE-2022-2023.pdf", 2011),  # page 69, 1245x1163
    "mist-shower": ("AQUILO-Catalogue-ENG-Latest_compressed.pdf", 211),  # page 7, 1241x1683
    "cascade-shower": ("AQUILO-Catalogue-ENG-Latest_compressed.pdf", 710),  # page 28, 1241x1300
    "rain-gold-dark": ("AQUILO-Catalogue-ENG-Latest_compressed.pdf", 821),  # page 31, 1241x1684
    "rain-column-gold": ("AQUILO-Catalogue-ENG-Latest_compressed.pdf", 838),  # page 32, 1241x1683
    "spa-dusk": ("wellness-2024-final-catalogue.pdf", 79),  # page 6, 2726x3553
    "jacuzzi-night": ("wellness-2024-final-catalogue.pdf", 217),  # page 13, 3965x3553
    "jacuzzi-night-2": ("wellness-2024-final-catalogue.pdf", 226),  # page 14, 3963x3553
    "black-tub": ("wellness-2024-final-catalogue.pdf", 367),  # page 21, 2165x1270
    "blush-tub": ("wellness-2024-final-catalogue.pdf", 388),  # page 23, 3543x3177
    "led-rain": ("wellness-2024-final-catalogue.pdf", 412),  # page 25, 3204x3553
}

OUT.mkdir(parents=True, exist_ok=True)
docs = {}
for name, (pdf, xref) in PICKS.items():
    doc = docs.setdefault(pdf, pymupdf.open(MEDIA / FOLDER[pdf] / pdf))
    pix = pymupdf.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    pix.save(OUT / f"{name}.png")
    print(name, pix.width, "x", pix.height)
