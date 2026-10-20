"""Template basin-mixer (single lever basin mixer): the CAD solid, called by build_cad.py.

Reads profile.json (side photo measurements) and fit.json (widths fitted to the other photos).

Template (shape.mjs is the same shape as points, for fitting):
    body     spline profile revolved about the vertical axis
    spout    side outline extruded across, intersected with the plan outline (width tapering from spoutW0 to
             spoutW1), edges filleted; this is how a CAD designer models a spout and it matches both silhouettes.
             (Lofting sections along x twists at the nose, and OpenCascade cannot fillet a plan whose tip lies on
             the side outline's tip, so the plan is a plain taper running past the tip.)
    aerator  round ring under the down turned nose
    lever    same construction: side outline from the photo, plan from leverW0 to leverW1 with a rounded tip
Build frame: y up from the base, the spout points to -x, z across, millimetres.
"""

import json
import math
from pathlib import Path

from build123d import (
    Axis, Cylinder, Line, Plane, Polyline, Pos, Rot, Spline, Wire, extrude, fillet, make_face, revolve,
)

AERATOR_H = 7.0
SPOUT_FILLETS = (7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.5)
LEVER_FILLETS = (1.2, 0.8, 0.5, 0.3)


def merged_slices(slices, window_mm=2.0):
    """One (x, top, bot) per x, smoothed over a small window, sorted from the body outwards (x descending)."""
    merged = {}
    for x, top, bot in slices:
        t, b = merged.get(x, (top, bot))
        merged[x] = (max(t, top), min(b, bot))
    xs = sorted(merged, reverse=True)
    out = []
    for x in xs:
        near = [merged[k] for k in xs if abs(k - x) <= window_mm]
        out.append((x, sum(t for t, _ in near) / len(near), sum(b for _, b in near) / len(near)))
    return out


def every(slices, step_mm):
    """Thin slices to about one every step_mm, keeping both ends."""
    out = [slices[0]]
    for s in slices[1:-1]:
        if abs(s[0] - out[-1][0]) >= step_mm:
            out.append(s)
    out.append(slices[-1])
    return out


def closed_face(pts):
    """Face bounded by one spline through pts (near duplicates dropped) and a straight closing line."""
    clean = [pts[0]]
    for q in pts[1:]:
        if math.dist(q, clean[-1]) > 0.05:
            clean.append(q)
    return make_face(Wire([Spline(*clean), Line(clean[-1], clean[0])]))


def side_face(slices, inner_x, step_mm, smooth):
    """Closed side outline: along the top from the body to the tip, round the tip, back along the bottom.
    smooth = one spline (spout); otherwise straight segments, which stay clean where the outline is very thin (lever)."""
    s = every(slices, step_mm)
    x_tip, t_tip, b_tip = s[-1]
    pts = [(inner_x, s[0][1])] + [(x, t) for x, t, _ in s]
    pts += [(x_tip - 0.5, (t_tip + b_tip) / 2)]
    pts += [(x, b) for x, _, b in reversed(s)] + [(inner_x, s[0][2])]
    if smooth:
        return closed_face(pts)
    clean = [pts[0]] + [q for i, q in enumerate(pts[1:]) if math.dist(q, pts[i]) > 0.05]
    return make_face(Polyline(*clean, close=True))


def plan_face(x0, x1, w0, w1, round_tip, n=10):
    """Closed plan outline in (x, z), tapering from w0 at x0 to w1 at x1. Without round_tip it is a plain taper
    that should run past the part's tip (the side outline then shapes the end and the fillets round it)."""
    pts = [(x0, w0 / 2), (x1, w1 / 2)]
    if round_tip:
        r = w1 / 2
        pts = [(x0, w0 / 2), (x1 + r, w1 / 2)]
        pts += [(x1 + r - r * math.sin(a), r * math.cos(a)) for a in (math.pi * k / n for k in range(1, n))]
        pts += [(x1 + r, -w1 / 2)]
    else:
        pts += [(x1, -w1 / 2)]
    pts += [(x0, -w0 / 2)]
    # Plane.XZ maps local (u, v) to world (x, z).
    return Plane.XZ * make_face(Polyline(*pts, close=True))


def prism_part(slices, inner_x, w0, w1, fillets, steps_mm, smooth, round_tip):
    """Side outline extruded across, intersected with the plan outline extruded through it, then filleted.
    OpenCascade's fillet succeeds or fails depending on the outline's point spacing, so try each spacing per
    radius and keep the roundest valid result. Returns (solid, fillet radius, spacing)."""
    x_tip = min(s[0] for s in slices)
    plans = []
    if round_tip:
        plans.append(plan_face(inner_x + 1, x_tip - 0.5, w0, w1, True))
    over = 6.0
    plans.append(plan_face(inner_x + 1, x_tip - over, w0, w1 + (w1 - w0) * over / abs(x_tip - inner_x), False))
    plans = [extrude(p, amount=400, both=True) for p in plans]
    cores = [(step, plan, extrude(side_face(slices, inner_x, step, smooth), amount=max(w0, w1), both=True) & plan)
             for step in steps_mm for plan in plans]
    for r in fillets:
        for step, _, core in cores:
            try:
                rounded = fillet(core.edges(), radius=r)
                if rounded.is_valid and rounded.volume > 0:
                    return rounded, r, step
            except Exception:
                pass
    return cores[0][2], 0.0, cores[0][0]


def build(product_dir: Path):
    """The tap as labelled parts in the build frame (y up), plus notes for cad.json."""
    profile = json.loads((product_dir / "profile.json").read_text())
    fit = json.loads((product_dir / "fit.json").read_text())
    housing_top = profile["housingTopMm"]

    # Body: thin the per row radii to every ~3 mm, keep the base and the top.
    rows = sorted(((r, y) for y, r in profile["body"] if r > 0 and y <= housing_top), key=lambda p: p[1])
    pts = [(rows[0][0], 0.0)]
    for r, y in rows[1:]:
        if y - pts[-1][1] >= 3.0:
            pts.append((r, y))
    if pts[-1][1] < rows[-1][1]:
        pts.append(rows[-1])
    top_y = pts[-1][1]
    profile_wire = Wire([Line((0, 0), pts[0]), Spline(*pts), Line(pts[-1], (0, top_y)), Line((0, top_y), (0, 0))])
    body = revolve(make_face(profile_wire), axis=Axis.Y)
    body_r = sorted(r for r, _ in pts)[len(pts) // 2]

    # Spout, with its nose; the lowest few mm of the nose are replaced by a round aerator ring.
    spout = merged_slices(profile["spout"])
    low = min(b for _, _, b in spout[len(spout) // 2:])
    ring = [x for x, _, b in spout if b < low + 4.0]
    ax = (max(ring) + min(ring)) / 2
    ar = min((max(ring) - min(ring)) / 2, 0.48 * fit["spoutW1"])
    spout = [(x, t, max(b, low + AERATOR_H - 2.0) if abs(x - ax) <= ar else b) for x, t, b in spout]
    spout_solid, spout_r, _ = prism_part(spout, -0.4 * body_r, fit["spoutW0"], fit["spoutW1"], SPOUT_FILLETS,
                                         steps_mm=(7.0, 9.0, 5.0), smooth=True, round_tip=False)
    aerator = Pos(ax, low + AERATOR_H / 2, 0) * Rot(90, 0, 0) * Cylinder(ar, AERATOR_H)
    aerator = fillet(aerator.edges(), radius=0.8)

    # Lever: from the back of the housing to the tip; never thinner than 1.6 mm.
    lever = [(x, t, min(b, t - 1.6)) for x, t, b in merged_slices(profile["lever"])]
    lever_solid, lever_r, _ = prism_part(lever, lever[0][0], fit["leverW0"], fit["leverW1"], LEVER_FILLETS,
                                         steps_mm=(4.0, 8.0), smooth=False, round_tip=True)

    tap = body + spout_solid + aerator + lever_solid
    tap.label = "main"
    details = [f"spout rounded {spout_r} mm", f"lever edges {lever_r} mm", f"aerator {2 * ar:.0f} mm across"]
    return [tap], {"details": details, "sizeNote": f"assumed {profile['heightMm']:.0f} mm tall"}
