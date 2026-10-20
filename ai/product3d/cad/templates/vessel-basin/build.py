"""Template vessel-basin (round countertop basin): the CAD solid, called by build_cad.py.

Reads fit.json (the fitted outer wall as a dense [r, y] profile, rim radius 200 while fitting) and views.json
("widthMm", the real width; the photo cannot give size). The ceramic is one revolved solid: the outer wall,
a rounded rim, the inside as the outer wall offset by the wall thickness, a floor that dishes into the waste hole.
The pop-up waste sits in the hole as its own part, in the basin's finish (as in the photo).
"""

import json
import math
from pathlib import Path

from build123d import Axis, Cylinder, Line, Pos, Rot, Spline, Wire, fillet, make_face, revolve

WALL = 10.0      # ceramic wall, mm
FLOOR = 14.0     # floor thickness where it meets the wall, mm
DISH = 5.0       # how far the floor falls towards the waste, mm
DRAIN_R = 22.0   # waste hole radius (a standard 1 1/4 inch waste)
CAP_R = 31.0     # pop-up cap radius


def offset_inwards(profile, t):
    """The outer wall offset by t towards the inside of the ceramic (normals of a curve going up the wall)."""
    out = []
    for i, (r, y) in enumerate(profile):
        r0, y0 = profile[max(0, i - 1)]
        r1, y1 = profile[min(len(profile) - 1, i + 1)]
        dr, dy = r1 - r0, y1 - y0
        n = math.hypot(dr, dy) or 1.0
        out.append((r - t * dy / n, y + t * dr / n))
    return out


def build(product_dir: Path):
    spec = json.loads((product_dir / "views.json").read_text())
    fit = json.loads((product_dir / "fit.json").read_text())
    k = spec["widthMm"] / (2 * max(r for r, _ in fit["profile"]))
    outer = [(r * k, y * k) for r, y in fit["profile"]]
    height = outer[-1][1]

    inner = [(r, y) for r, y in offset_inwards(outer, WALL) if FLOOR < y < height]
    rim_in = (outer[-1][0] - WALL, height)
    # The inside runs on down the wall and dishes gently into the waste, as a real basin drains.
    floor_r = inner[0][0]
    waste = (DRAIN_R + 4.0, FLOOR - DISH)
    dish = [((floor_r + waste[0]) / 2, FLOOR - DISH * 0.6), waste]
    inside = [rim_in] + list(reversed(inner)) + dish
    # Outer wall and inside as smooth splines; rim and waste as straight lines.
    edges = [Line((DRAIN_R, 0.0), outer[0]), Spline(*outer), Line(outer[-1], rim_in),
             Spline(*inside), Line(waste, (DRAIN_R, waste[1])), Line((DRAIN_R, waste[1]), (DRAIN_R, 0.0))]
    edges = [e for e in edges if e.length > 1e-3]
    ceramic = revolve(make_face(Wire(edges)), axis=Axis.Y)

    # Round the rim and the base edge; glazed ceramic has no sharp edges.
    rim = [e for e in ceramic.edges() if abs(e.center().Y - height) < 0.5 or (abs(e.center().Y) < 0.5 and e.radius > DRAIN_R + 1)]
    rounded = 0.0
    for radius in (WALL * 0.45, WALL * 0.3, 2.0, 1.0):
        try:
            candidate = fillet(rim, radius=radius)
            if candidate.is_valid:
                ceramic, rounded = candidate, radius
                break
        except Exception:
            pass
    ceramic.label = "main"

    # Pop-up waste: a domed cap just above the floor.
    cap = Pos(0, FLOOR - DISH + 3.0, 0) * Rot(90, 0, 0) * Cylinder(CAP_R, 6.0)
    cap = fillet(cap.edges().sort_by(Axis.Y)[-1:], radius=2.5)
    cap.label = "main"

    details = [f"{height:.0f} mm tall at {spec['widthMm']:.0f} mm wide", f"wall {WALL:.0f} mm, rim rounded {rounded:.1f} mm",
               f"waste {2 * DRAIN_R:.0f} mm"]
    return [ceramic, cap], {"details": details, "sizeNote": spec.get("sizeNote", "")}
