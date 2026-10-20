// Scores 3D models of a product: silhouette match with its four photos, and shape distance to the
// dataset's reference model (lower is better; in model heights, so 0.01 = 1% of the product's height).
// Usage (from ai/): node product3d/score.mjs <product dir> [model.glb other.glb …]   (default: mesh.glb model.glb)
import path from "node:path";
import { existsSync } from "node:fs";
import { readPhotos, readSurface, samplePoints, shapeDistance, silhouetteScore } from "./lib.mjs";

const [dir, ...files] = process.argv.slice(2);
const photos = await readPhotos(dir);
const refSurface = await readSurface(path.join(dir, "reference.glb"));
const ref = samplePoints(refSurface, 5000);
// Silhouettes need a dense point cloud; the shape distance is fine with 5,000 points.
const rows = [["reference.glb", silhouetteScore(samplePoints(refSurface, 40000), photos).score, 0]];
for (const f of files.length ? files : ["mesh.glb", "model.glb"]) {
  const file = path.join(dir, f);
  if (!existsSync(file)) continue;
  const surface = await readSurface(file);
  rows.push([f, silhouetteScore(samplePoints(surface, 40000), photos).score, shapeDistance(samplePoints(surface, 5000), ref)]);
}
for (const [f, iou, d] of rows) console.log(`${path.basename(dir).padEnd(22)} ${f.padEnd(26)} outline ${(iou * 100).toFixed(1)}%   distance ${(d * 100).toFixed(2)}%`);
