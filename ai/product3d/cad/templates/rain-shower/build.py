"""Template rain-shower (round overhead shower on a wall arm): the CAD solid, called by build_cad.py.

Reads fit.json (the fitted arm, hub and head proportions, mm, with the head diameter from the listing).
Parts: the arm (a tube swept along straight, bend, straight), the wall flange, the hub and the head (all chrome,
"main"), and the nozzle mat on the head's face ("rubber", one solid).
"""

import json
import math
from pathlib import Path

from build123d import (
    Axis, Circle, Compound, Cylinder, Line, Plane, Pos, Rot, Spline, Wire, CenterArc, fillet, make_face, revolve,
    sweep,
)

HEAD_D = 200.0        # the head size the fit works in (template.mjs)
NOZZLE_PITCH = 11.0   # spacing between nozzle rings and along each ring, mm


def circle_radius(edge):
    """Radius of a circular edge, or 0 for straight lines and seams."""
    try:
        return edge.radius
    except ValueError:
        return 0.0


def try_fillet(shape, edges, radii):
    for r in radii:
        try:
            out = fillet(edges, radius=r)
            if out.is_valid:
                return out, r
        except Exception:
            pass
    return shape, 0.0


def build(product_dir: Path):
    spec = json.loads((product_dir / "views.json").read_text())
    # The fit works with a 200 mm head; scale everything to the real head size.
    k = spec.get("headDiameterMm", HEAD_D) / HEAD_D
    p = {key: value * k for key, value in json.loads((product_dir / "fit.json").read_text())["params"].items()}
    head_d = HEAD_D * k
    head_r = head_d / 2
    bend = min(p["bendR"], p["drop"] - 2)
    hub_top = p["headT"] + p["hubH"]
    arm_y = hub_top + p["drop"]
    wall_x = -p["reach"]
    r = p["tubeD"] / 2

    # Arm: from inside the flange, out from the wall, round the bend, down into the hub.
    path = Wire([
        Line((wall_x + 2, arm_y, 0), (-bend, arm_y, 0)),
        CenterArc((-bend, arm_y - bend, 0), bend, 90, -90),
        Line((0, arm_y - bend, 0), (0, hub_top - 2, 0)),
    ])
    profile = Plane(origin=(wall_x + 2, arm_y, 0), z_dir=(1, 0, 0)) * Circle(r)
    arm = sweep(profile, path=path)

    # Wall flange: a disc on the wall with a rounded front.
    flange = Pos(wall_x + p["flangeT"] / 2, arm_y, 0) * Rot(0, 90, 0) * Cylinder(p["flangeD"] / 2, p["flangeT"])
    flange, _ = try_fillet(flange, flange.edges().sort_by(Axis.X)[-1:], (p["flangeT"] * 0.4, 2.0, 1.0))

    # Hub between the arm and the head.
    hub = Pos(0, p["headT"] + p["hubH"] / 2, 0) * Rot(90, 0, 0) * Cylinder(p["hubD"] / 2, p["hubH"] + 1.0)
    hub, _ = try_fillet(hub, hub.edges(), (1.5, 0.8))

    # Head: flat face, thin at the edge, rising towards the hub; edge rounded.
    edge_t = p["headT"] * 0.6
    head_profile = Wire([
        Line((0, 0), (head_r, 0)), Line((head_r, 0), (head_r, edge_t)),
        Line((head_r, edge_t), (p["hubD"] / 2 + 6, p["headT"])), Line((p["hubD"] / 2 + 6, p["headT"]), (0, p["headT"])),
        Line((0, p["headT"]), (0, 0)),
    ])
    head = revolve(make_face(head_profile), axis=Axis.Y)
    head, head_round = try_fillet(head, [e for e in head.edges() if circle_radius(e) > head_r - 1], (edge_t * 0.45, 1.5, 0.8))

    chrome = arm + flange + hub + head
    chrome.label = "main"

    # Nozzles: rings of short soft pins on the face, like the photo.
    nozzles = []
    rad = 16.0
    while rad < head_r - 10:
        n = max(6, round(2 * math.pi * rad / NOZZLE_PITCH))
        for k in range(n):
            a = 2 * math.pi * k / n
            # 2.5 mm proud of the face, 0.6 mm sunk into the hidden mat.
            nozzles.append(Pos(rad * math.cos(a), -0.95, rad * math.sin(a)) * Rot(90, 0, 0) * Cylinder(1.6, 3.1))
        rad += NOZZLE_PITCH
    # The pins are fused to one rubber mat sunk just inside the chrome face (hidden, as in a real head): a single
    # solid, so the web viewer draws one mesh instead of hundreds, and the face stays chrome.
    mat = Pos(0, 0.5, 0) * Rot(90, 0, 0) * Cylinder(head_r - 6.0, 0.8)
    pins = mat + Compound(children=nozzles)
    pins.label = "rubber"

    details = [f"head {head_d:.0f} mm, edge rounded {head_round:.1f} mm", f"arm {p['reach']:.0f} mm out, {p['drop']:.0f} mm down",
               f"{len(nozzles)} nozzles"]
    return [chrome, pins], {"details": details, "sizeNote": spec.get("sizeNote", "")}
