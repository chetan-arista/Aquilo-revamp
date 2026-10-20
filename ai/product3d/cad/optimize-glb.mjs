// CAD route, web step: model-cad.glb (exact tessellation, every CAD face its own primitive) → model-web.glb for
// the site: one primitive per part, welded, simplified within a tolerance far below what the eye sees, meshopt
// compressed. The STEP and model-cad.glb stay exact for Blender and engineering.
// Usage (from ai/): node product3d/cad/optimize-glb.mjs <product dir> [--error-mm 0.08]
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, join, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { stat } from "node:fs/promises";
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
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, doc);
const prims = doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0);
console.log(`model-web.glb: ${before} → ${count()} vertices, ${prims} primitives, ${((await stat(src)).size / 1024).toFixed(0)} KB → ${((await stat(out)).size / 1024).toFixed(0)} KB`);
