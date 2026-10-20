"""CAD route, step 4: build the product's CAD solid from its template and export it.

Usage (Blender's bundled Python, which has build123d installed):
    <blender>/4.5/python/bin/python.exe product3d/cad/build_cad.py <product dir>

views.json names the template; templates/<template>/build.py has build(product_dir) → (parts, notes), parts in
the build frame (y up, millimetres), each labelled with its finish: "main" (the product's switchable finish) or a
fixed one ("chrome", "rubber", …). Writes model.step (CAD, Z up), model-cad.glb (metres; part labels become node
names, which the renderer and the web viewer read) and cad.json (size, volume, notes).
"""

import importlib.util
import json
import sys
from pathlib import Path

from build123d import Axis, Compound, export_gltf, export_step


def main(product_dir: Path):
    spec = json.loads((product_dir / "views.json").read_text())
    template = spec["template"]
    path = Path(__file__).resolve().parent / "templates" / template / "build.py"
    module_spec = importlib.util.spec_from_file_location(f"template_{template.replace('-', '_')}", path)
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    parts, notes = module.build(product_dir)

    # CAD convention (and build123d's glTF export) is Z up.
    product = Compound(children=[p.rotate(Axis.X, 90) for p in parts])
    product.label = template
    for part, src in zip(product.children, parts):
        part.label = src.label
    size = product.bounding_box().size
    valid = all(p.is_valid for p in parts)
    volume = sum(p.volume for p in parts)
    stats = {"template": template, "valid": valid, "volumeCm3": round(volume / 1000, 1),
             "sizeMm": [round(size.X, 1), round(size.Y, 1), round(size.Z, 1)],
             "parts": [p.label for p in parts], **notes}
    print(f"{template}: valid {valid}, {len(parts)} parts, volume {volume / 1000:.1f} cm3, "
          f"{size.X:.0f} x {size.Y:.0f} x {size.Z:.0f} mm; " + "; ".join(notes.get("details", [])))
    (product_dir / "cad.json").write_text(json.dumps(stats, indent=2))
    export_step(product, str(product_dir / "model.step"))
    # export_gltf writes metres from millimetres itself; deflections are in model units (mm).
    export_gltf(product, str(product_dir / "model-cad.glb"), binary=True, linear_deflection=0.05, angular_deflection=0.15)
    print("wrote model.step, model-cad.glb, cad.json")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
