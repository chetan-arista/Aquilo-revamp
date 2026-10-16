"""Extract the vector AQUILO wordmark from a catalogue page into a standalone SVG.
usage: extract_logo.py <pdf> <page> <x0> <y0> <x1> <y1> <out.svg>
"""
import sys, pymupdf

pdf, pno, x0, y0, x1, y1, out = sys.argv[1], int(sys.argv[2]), *map(float, sys.argv[3:7]), sys.argv[7]
page = pymupdf.open(pdf)[pno]
region = pymupdf.Rect(x0, y0, x1, y1)

paths, bbox = [], None
for d in page.get_drawings():
    if not d["rect"].intersects(region) or d.get("fill") is None:
        continue
    if not region.contains(d["rect"]):
        continue
    seg = []
    for item in d["items"]:
        op = item[0]
        if op == "l":
            a, b = item[1], item[2]
            seg.append(("L", [a, b]))
        elif op == "c":
            seg.append(("C", item[1:5]))
        elif op == "re":
            r = item[1]
            seg.append(("R", [r]))
        elif op == "qu":
            q = item[1]
            seg.append(("Q4", [q.ul, q.ur, q.lr, q.ll]))
    # Build path data: consecutive segments, new subpath when start point jumps.
    dstr, cur = [], None
    for op, pts in seg:
        if op == "R":
            r = pts[0]
            dstr.append(f"M{r.x0:.3f} {r.y0:.3f}H{r.x1:.3f}V{r.y1:.3f}H{r.x0:.3f}Z"); cur = None; continue
        if op == "Q4":
            a, b, c, e = pts
            dstr.append(f"M{a.x:.3f} {a.y:.3f}L{b.x:.3f} {b.y:.3f}L{c.x:.3f} {c.y:.3f}L{e.x:.3f} {e.y:.3f}Z"); cur = None; continue
        start = pts[0]
        if cur is None or abs(cur.x - start.x) > 1e-3 or abs(cur.y - start.y) > 1e-3:
            dstr.append(f"M{start.x:.3f} {start.y:.3f}")
        if op == "L":
            dstr.append(f"L{pts[1].x:.3f} {pts[1].y:.3f}")
        else:
            dstr.append("C" + " ".join(f"{p.x:.3f} {p.y:.3f}" for p in pts[1:]))
        cur = pts[-1]
    if d.get("closePath"):
        dstr.append("Z")
    fill = d["fill"]
    paths.append(("".join(dstr), d.get("even_odd", False), fill))
    bbox = d["rect"] if bbox is None else bbox | d["rect"]

print("paths", len(paths), "bbox", bbox)
for s in page.get_text("dict")["blocks"]:
    for l in s.get("lines", []):
        for sp in l["spans"]:
            if pymupdf.Rect(sp["bbox"]).intersects(region):
                print("text span", repr(sp["text"]), sp["font"], sp["size"], sp["bbox"])

pad = 1
vb = f"{bbox.x0 - pad:.3f} {bbox.y0 - pad:.3f} {bbox.width + 2 * pad:.3f} {bbox.height + 2 * pad:.3f}"
with open(out, "w") as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n')
    for dd, eo, fill in paths:
        col = "#%02x%02x%02x" % tuple(int(c * 255) for c in fill)
        f.write(f'<path d="{dd}" fill="{col}"{" fill-rule=\"evenodd\"" if eo else ""}/>\n')
    f.write("</svg>\n")
