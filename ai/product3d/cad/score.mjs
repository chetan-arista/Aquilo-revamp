// CAD route, check: how well the finished CAD solid's outline matches each photo (silhouette IoU).
// Usage (from ai/): node product3d/cad/score.mjs <product dir>
// Uses the cameras found by fit.mjs, refined by a small search, on dense points from model-cad.glb.
// Writes score.json. 100% = the outline matches the photo exactly at the 200 px grid.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readSurface, samplePoints } from "../lib.mjs";
import { iou, project, readMask } from "./silhouette.mjs";

const dir = path.resolve(process.argv[2]);
const spec = JSON.parse(await readFile(path.join(dir, "views.json"), "utf8"));
const fit = JSON.parse(await readFile(path.join(dir, "fit.json"), "utf8"));
const X = samplePoints(await readSurface(path.join(dir, "model-cad.glb")), 200000);

const views = [];
for (const v of spec.views) {
  const mask = await readMask(dir, v.name);
  // Generic templates store a camera per photo; the tap's own fit stores its two.
  const start = fit.cameras?.[v.name] ?? (v.name === "three-quarter" ? fit : fit.sideCamera);
  const [lo, hi] = v.pitch ?? [-90, 90];
  let best = { iou: -1 };
  for (const mirror of [false, true]) for (let dy = -24; dy <= 24; dy += 3) for (let dp = -9; dp <= 9; dp += 3) {
    const yaw = start.yaw + dy, pitch = Math.min(hi, Math.max(lo, start.pitch + dp)), s = iou(project(X, yaw, pitch, mirror, mask.box), mask.grid);
    if (s > best.iou) best = { iou: s, yaw, pitch, mirror };
  }
  views.push({ name: v.name, iou: +best.iou.toFixed(4), yaw: best.yaw, pitch: best.pitch });
  console.log(`${v.name}: ${(best.iou * 100).toFixed(1)}% (yaw ${best.yaw}, pitch ${best.pitch})`);
}
const mean = views.reduce((a, v) => a + v.iou, 0) / views.length;
await writeFile(path.join(dir, "score.json"), JSON.stringify({ views, mean: +mean.toFixed(4) }, null, 2));
console.log(`mean ${(mean * 100).toFixed(1)}%`);
