// CAD route, step 3 for templates that are fitted by outline: adjust a template's shape and every photo's camera
// until the template's silhouette matches the photos (analysis by synthesis). Works from a single photo.
// Usage (from ai/): node product3d/cad/fit-template.mjs <product dir>
// views.json names the template; templates/<template>/template.mjs exports
//   params            { name: { init, min, max, step } }   in mm (one size is fixed by a known dimension)
//   points(p)         Float32Array of surface points, mm, y up, turntable axis = the y axis
//   extra(p)          optional, more data for build.py (e.g. a dense profile)
//   summary(p)        optional, one line for the lab page
// A view may limit its camera: "pitch": [min, max] in degrees (positive = from above), because a round piece's
// outline looks nearly the same from slightly above and slightly below.
// Writes fit.json { template, params, cameras, iou, summary, …extra } and fit-<view>.png overlays
// (grey = both, green = photo only, red = model only).
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { G, iou, project, readMask } from "./silhouette.mjs";

const dir = path.resolve(process.argv[2]);
const spec = JSON.parse(await readFile(path.join(dir, "views.json"), "utf8"));
const T = await import(pathToFileURL(path.join(import.meta.dirname, "templates", spec.template, "template.mjs")).href);
const masks = await Promise.all(spec.views.map((v) => readMask(dir, v.name)));

let p = Object.fromEntries(Object.entries(T.params).map(([k, v]) => [k, v.init]));
const clamp = (k, v) => Math.min(T.params[k].max, Math.max(T.params[k].min, v));
const viewScore = (X, cam, k) => iou(project(X, cam.yaw, cam.pitch, cam.mirror, masks[k].box), masks[k].grid);
const total = (q, cams) => { const X = T.points(q); return cams.reduce((a, c, k) => a + viewScore(X, c, k), 0) / cams.length; };

// 1 Each photo's camera, coarse, with the starting shape (or the hint in views.json).
const X0 = T.points(p);
const cams = spec.views.map((v, k) => {
  if (v.camera) return { mirror: false, ...v.camera };
  const [lo, hi] = v.pitch ?? [-45, 60];
  let best = { s: -1 };
  for (const mirror of [false, true]) for (let yaw = -180; yaw < 180; yaw += 15) for (let pitch = lo; pitch <= hi; pitch += 7.5) {
    const s = viewScore(X0, { yaw, pitch, mirror }, k);
    if (s > best.s) best = { s, cam: { yaw, pitch, mirror } };
  }
  return best.cam;
});
let score = total(p, cams);
console.log(`cameras: ${cams.map((c) => `yaw ${c.yaw} pitch ${c.pitch}${c.mirror ? " mirrored" : ""}`).join(", ")} → IoU ${score.toFixed(3)}`);

// 2 Coordinate descent on shape and cameras together, halving the steps each round.
const steps = Object.fromEntries(Object.entries(T.params).map(([k, v]) => [k, v.step]));
let camStep = 6;
for (let round = 0; round < 7; round++) {
  for (const key of Object.keys(steps)) for (const sign of [1, -1]) {
    for (;;) {
      const q = { ...p, [key]: clamp(key, p[key] + sign * steps[key]) };
      if (q[key] === p[key]) break;
      const s = total(q, cams);
      if (s > score + 1e-4) { score = s; p = q; } else break;
    }
  }
  cams.forEach((_, k) => {
    for (const key of ["yaw", "pitch"]) for (const sign of [1, -1]) {
      for (;;) {
        const [lo, hi] = spec.views[k].pitch ?? [-90, 90];
        const moved = { ...cams[k], [key]: cams[k][key] + sign * camStep };
        if (moved.pitch < lo || moved.pitch > hi) break;
        const trial = cams.map((x, j) => (j === k ? moved : x));
        const s = total(p, trial);
        if (s > score + 1e-4) { score = s; cams[k] = trial[k]; } else break;
      }
    }
  });
  for (const key in steps) steps[key] /= 2;
  camStep /= 2;
}
const X = T.points(p);
const perView = Object.fromEntries(spec.views.map((v, k) => [v.name, +viewScore(X, cams[k], k).toFixed(4)]));
const round2 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? +v.toFixed(2) : v]));
console.log(`fit: IoU ${score.toFixed(3)}`, perView, round2(p));

for (const [k, v] of spec.views.entries()) {
  const grid = project(X, cams[k].yaw, cams[k].pitch, cams[k].mirror, masks[k].box), img = Buffer.alloc(G * G * 3, 255);
  for (let j = 0; j < G * G; j++) img.set(masks[k].grid[j] && grid[j] ? [120, 120, 120] : masks[k].grid[j] ? [40, 180, 60] : grid[j] ? [220, 50, 50] : [255, 255, 255], j * 3);
  await sharp(img, { raw: { width: G, height: G, channels: 3 } }).resize(600, 600, { kernel: "nearest" }).png().toFile(path.join(dir, `fit-${v.name}.png`));
}
const cameras = Object.fromEntries(spec.views.map((v, k) => [v.name, round2(cams[k])]));
await writeFile(path.join(dir, "fit.json"), JSON.stringify({
  template: spec.template, params: round2(p), cameras, iou: perView,
  summary: T.summary?.(p, cameras) ?? "", ...(T.extra?.(p) ?? {}),
}, null, 2));
