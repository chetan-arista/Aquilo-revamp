// CAD route, web step: model-cad.glb (exact tessellation, every CAD face its own primitive) → two files from one
// cleanup (one primitive per part, welded, simplified within a tolerance far below what the eye sees):
//   model-web.glb  meshopt compressed, for the site's 3D viewer (which sets the finish itself)
//   model-ar.glb   uncompressed with real PBR materials named by part ("main", "rubber") in the product's finish,
//                  for phone AR (<model-viewer>: Scene Viewer, Quick Look), which can switch finish by material
// The STEP and model-cad.glb stay exact for Blender and engineering.
// Usage (from ai/): node product3d/cad/optimize-glb.mjs <product dir> [--error-mm 0.08]
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, join, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith("--")));
const errorMm = Number(args.includes("--error-mm") ? args[args.indexOf("--error-mm") + 1] : 0.08);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const src = path.join(dir, "model-cad.glb"), out = path.join(dir, "model-web.glb");
const doc = await io.read(src);
const count = () => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + p.getAttribute("POSITION").getCount(), 0), 0);
const before = count();
// The error is relative to each mesh's size; the model is in metres, so convert from mm using the overall size.
const size = Math.max(...doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives().map((p) => {
  const a = p.getAttribute("POSITION"), lo = a.getMinNormalized([]), hi = a.getMaxNormalized([]);
  return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
})));
await doc.transform(
  dedup(),
  join({ keepNamed: true }),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: errorMm / 1000 / size, lockBorder: false }),
  prune(),
);

// AR file: a material per part, in the product's finish (linear base colour, metallic, roughness; the same
// finishes as the site's viewer, ProductOrbit FINISHES).
const PBR = {
  "chrome": [[0.89, 0.9, 0.93], 1, 0.04], "brushed nickel": [[0.58, 0.53, 0.47], 1, 0.32],
  "matte black": [[0.012, 0.012, 0.012], 0, 0.45], "gloss white": [[0.86, 0.86, 0.83], 0, 0.15],
  "matte stone": [[0.48, 0.44, 0.38], 0, 0.6], "rubber": [[0.08, 0.085, 0.09], 0, 0.75],
};
const spec = JSON.parse(await readFile(path.join(dir, "views.json"), "utf8"));
const partOf = (node) => { for (let n = node; n; n = n.getParentNode()) { const name = n.getName().split(/[._]/)[0]; if (name === "main" || PBR[name]) return name; } return "main"; };
const materials = new Map();
const materialFor = (part) => {
  if (!materials.has(part)) {
    const [color, metal, rough] = PBR[part === "main" ? spec.finish ?? "chrome" : part] ?? PBR.chrome;
    materials.set(part, doc.createMaterial(part).setBaseColorFactor([...color, 1]).setMetallicFactor(metal).setRoughnessFactor(rough).setDoubleSided(false));
  }
  return materials.get(part);
};
for (const node of doc.getRoot().listNodes()) node.getMesh()?.listPrimitives().forEach((p) => p.setMaterial(materialFor(partOf(node))));
await doc.transform(prune());
const outAr = path.join(dir, "model-ar.glb");
await io.write(outAr, doc);

await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
await io.write(out, doc);
const prims = doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0);
console.log(`model-web.glb: ${before} → ${count()} vertices, ${prims} primitives, ${((await stat(src)).size / 1024).toFixed(0)} KB → ${((await stat(out)).size / 1024).toFixed(0)} KB; model-ar.glb ${((await stat(outAr)).size / 1024).toFixed(0)} KB (${[...materials.keys()].join(", ")})`);
