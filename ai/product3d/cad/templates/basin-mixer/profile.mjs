// CAD route, step 2: measure a single lever basin mixer from its side photo mask.
// Usage (from ai/): node product3d/cad/templates/basin-mixer/profile.mjs <product dir> [--height-mm 160]
// Reads side-mask.png (spout pointing left) and writes profile.json in millimetres, tap frame:
//   y up from the base, x towards the spout (negative = front), body axis at x = 0.
//   body:  [[y, r], …]        surface of revolution, radius read from the back edge (nothing hides it)
//   spout: [[x, yTop, yBot]…]  column slices of the spout from the body to the tip
//   lever: [[x, yTop, yBot]…]  column slices of the lever blade
// The real height is not in the photos; it is an assumption passed in (catalogue data in production).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(process.argv[2]);
const args = process.argv.slice(3);
const heightMm = Number(args.includes("--height-mm") ? args[args.indexOf("--height-mm") + 1] : 160);

const { data: m, info } = await sharp(path.join(dir, "side-mask.png")).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels, on = (x, y) => m[(y * W + x) * C] > 127;

let top = H, bot = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); }
const runs = (y) => { const r = []; let s = -1; for (let x = 0; x <= W; x++) { const v = x < W && on(x, y); if (v && s < 0) s = x; if (!v && s >= 0) { r.push([s, x - 1]); s = -1; } } return r; };
const right = (y) => { const r = runs(y); return r.length ? r[r.length - 1][1] : -1; };

// Axis: the middle of the column a little above the base, where nothing is attached.
const hPx = bot - top, mids = [];
for (let y = Math.round(bot - 0.3 * hPx); y < bot - 0.12 * hPx; y++) { const r = runs(y); const [a, b] = r[r.length - 1]; mids.push((a + b) / 2); }
mids.sort((a, b) => a - b);
const cx = mids[mids.length >> 1];
const mm = heightMm / hPx, X = (x) => (x - cx) * mm, Y = (y) => (bot - y) * mm;

// Body radius per row from the back edge, up to the top of the housing (where the back edge falls away under the lever).
const body = [];
const upper = Array.from({ length: Math.round(0.2 * hPx) }, (_, k) => right(Math.round(bot - 0.6 * hPx) - k) - cx).sort((a, b) => a - b);
const housingR = upper[upper.length >> 1];
let housingTop = top;
for (let y = bot; y >= top; y--) {
  const r = right(y);
  if (y < bot - 0.6 * hPx && r - cx < 0.8 * housingR) { housingTop = y + 1; break; }
  if ((bot - y) % 2 === 0) body.push([+Y(y).toFixed(2), +((r + 0.5 - cx) * mm).toFixed(2)]);
}

// Columns in front of the body: the lowest run is the spout. The lever is everything above the housing plus
// the blade in front of it (the band near the top).
const bodyLeft = Math.min(...Array.from({ length: Math.round(0.25 * hPx) }, (_, k) => { const y = Math.round(bot - 0.15 * hPx) - k; return 2 * cx - right(y); }));
const spout = [], lever = [];
for (let x = W - 1; x >= 0; x--) {
  const col = []; let s = -1;
  for (let y = 0; y <= H; y++) { const v = y < H && on(x, y); if (v && s < 0) s = y; if (!v && s >= 0) { col.push([s, y - 1]); s = -1; } }
  for (const [a, b] of col) {
    if (a < housingTop - 1 || (x < bodyLeft - 2 && a < top + 0.2 * hPx)) lever.push([+X(x).toFixed(2), +Y(a).toFixed(2), +Y(Math.min(b, x < bodyLeft - 2 ? b : housingTop)).toFixed(2)]);
    // The base flares out past the column near the floor; the spout is never down there.
    else if (x < bodyLeft - 2 && b < bot - 0.25 * hPx) spout.push([+X(x).toFixed(2), +Y(a).toFixed(2), +Y(b).toFixed(2)]);
  }
}
const out = { heightMm, housingTopMm: +Y(housingTop).toFixed(2), pxPerMm: 1 / mm, axisPx: cx, basePx: bot, body, spout, lever };
await writeFile(path.join(dir, "profile.json"), JSON.stringify(out));
const span = (s) => s.length ? `${s.length} slices, x ${s[s.length - 1][0]}..${s[0][0]} mm` : "none";
console.log(`axis ${cx}px, ${hPx}px tall → ${heightMm} mm; base r ${body[3][1]} mm; spout ${span(spout)}; lever ${span(lever)}`);
