// CAD route, step 3: fit what the side photo cannot show (part widths) and the camera angle of the other photos.
// Usage (from ai/): node product3d/cad/templates/basin-mixer/fit.mjs <product dir>
// Searches yaw / pitch (and mirror) of the three quarter photo together with the spout and lever widths, scoring
// silhouette IoU. Writes fit.json (widths + camera) and fit-<view>.png overlays (green = photo only, red = model only).
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { points } from "./shape.mjs";
import { G, iou, project, readMask as readMaskIn } from "../../silhouette.mjs";

const dir = path.resolve(process.argv[2]);
const profile = JSON.parse(await readFile(path.join(dir, "profile.json"), "utf8"));
const readMask = (name) => readMaskIn(dir, name);
const tq = await readMask("three-quarter");
const r0 = profile.body[Math.floor(profile.body.length * 0.75)][1];
let p = { spoutW0: 1.2 * r0, spoutW1: 1.2 * r0, leverW0: 2 * r0, leverW1: 1.2 * r0, yaw: 0, pitch: 15, mirror: false };
const score = (q) => iou(project(points(profile, q, 3), q.yaw, q.pitch, q.mirror, tq.box), tq.grid);

// Camera first (coarse), then coordinate descent on everything.
let best = { s: -1 };
for (const mirror of [false, true]) for (let yaw = -180; yaw < 180; yaw += 10) for (let pitch = 0; pitch <= 40; pitch += 10) {
  const q = { ...p, yaw, pitch, mirror }, s = score(q);
  if (s > best.s) best = { s, q };
}
p = best.q;
console.log(`camera: yaw ${p.yaw} pitch ${p.pitch} mirror ${p.mirror} → IoU ${best.s.toFixed(3)}`);
const steps = { yaw: 4, pitch: 4, spoutW0: 4, spoutW1: 4, leverW0: 4, leverW1: 4 };
for (let round = 0; round < 6; round++) {
  for (const key of Object.keys(steps)) for (const dir of [1, -1]) {
    for (;;) {
      const q = { ...p, [key]: p[key] + dir * steps[key] };
      if (key.endsWith("W0") || key.endsWith("W1")) if (q[key] < 2) break;
      const s = score(q);
      if (s > best.s + 1e-4) { best = { s, q }; p = q; } else break;
    }
  }
  for (const key in steps) steps[key] /= 2;
}
console.log(`fit: IoU ${best.s.toFixed(3)}`, Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === "number" ? +v.toFixed(2) : v])));

// Side view check: the same model at yaw 0 / 180 against the side photo.
const side = await readMask("side");
let sideBest = { s: -1 };
for (const yaw of [0, 180]) for (const mirror of [false, true]) for (let pitch = 0; pitch <= 20; pitch += 5) {
  const s = iou(project(points(profile, p, 2), yaw, pitch, mirror, side.box), side.grid);
  if (s > sideBest.s) sideBest = { s, yaw, pitch, mirror };
}
console.log(`side photo IoU ${sideBest.s.toFixed(3)} (yaw ${sideBest.yaw}, pitch ${sideBest.pitch})`);

async function overlay(name, mask, grid) {
  const img = Buffer.alloc(G * G * 3, 255);
  for (let j = 0; j < G * G; j++) {
    const c = mask.grid[j] && grid[j] ? [120, 120, 120] : mask.grid[j] ? [40, 180, 60] : grid[j] ? [220, 50, 50] : [255, 255, 255];
    img.set(c, j * 3);
  }
  await sharp(img, { raw: { width: G, height: G, channels: 3 } }).resize(600, 600, { kernel: "nearest" }).png().toFile(path.join(dir, `fit-${name}.png`));
}
await overlay("three-quarter", tq, project(points(profile, p, 2), p.yaw, p.pitch, p.mirror, tq.box));
await overlay("side", side, project(points(profile, p, 2), sideBest.yaw, sideBest.pitch, sideBest.mirror, side.box));
const cam = (c) => ({ yaw: c.yaw, pitch: c.pitch, mirror: c.mirror });
await writeFile(path.join(dir, "fit.json"), JSON.stringify({
  ...p, iouThreeQuarter: +best.s.toFixed(4), iouSide: +sideBest.s.toFixed(4), sideCamera: sideBest,
  // The shared shape of every template's fit.json (lab page, score.mjs, render_blender.py).
  template: "basin-mixer",
  cameras: { side: cam(sideBest), "side-b": cam(sideBest), "three-quarter": cam(p) },
  iou: { side: +sideBest.s.toFixed(4), "three-quarter": +best.s.toFixed(4) },
  summary: `Spout ${p.spoutW0.toFixed(0)} to ${p.spoutW1.toFixed(0)} mm wide, lever ${p.leverW0.toFixed(0)} to ${p.leverW1.toFixed(0)} mm (widths the side photo cannot show). Second camera found ${p.yaw}° round, ${p.pitch}° above.`,
}, null, 2));
