// CAD route, step 1: turn a product's raw photos into clean views and foreground masks.
// Usage (from ai/): node product3d/cad/prepare.mjs <product dir>
// <product dir>/views.json lists the photos and roughly where each was taken from:
//   { "source": "../tiema-zs82003", "views": [{ "name": "side", "file": "02.webp", "flip": false, "logo": [0,0,260,80] }, …] }
// Writes <name>.png (logo areas painted white) and <name>-mask.png (white = product) next to views.json.
// Background = near white pixels connected to the border, so bright chrome highlights inside the product stay solid;
// then only the largest shape is kept, so logos and captions need no boxes (boxes still work for logos that touch).
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(process.argv[2]);
const spec = JSON.parse(await readFile(path.join(dir, "views.json"), "utf8"));

for (const v of spec.views) {
  // Phone and studio photos can be huge; 1000 px is plenty for the outline and keeps this step fast.
  let img = sharp(path.join(dir, spec.source, v.file)).rotate().removeAlpha().resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true });
  if (v.flip) img = img.flop();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  for (const [x0, y0, x1, y1] of v.logo ?? []) {
    const [a0, a1] = v.flip ? [W - x1, W - x0] : [x0, x1];
    for (let y = y0; y < y1; y++) for (let x = a0; x < a1; x++) data.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
  }
  const light = (i) => Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) >= (v.threshold ?? 250);
  const bg = new Uint8Array(W * H), stack = [];
  const push = (i) => { if (!bg[i] && light(i)) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  // Close small gaps where a highlight touches the outline (dilate then erode the product), then fill holes.
  const R = v.close ?? 3;
  let fg = Uint8Array.from(bg, (b) => 1 - b);
  const grow = (src, val) => {
    const out = new Uint8Array(src);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x] === val) continue;
      search: for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && xx >= 0 && yy < H && xx < W && src[yy * W + xx] === val) { out[y * W + x] = val; break search; }
      }
    }
    return out;
  };
  fg = grow(grow(fg, 1), 0);
  const outside = new Uint8Array(W * H);
  const seed = (i) => { if (!outside[i] && !fg[i]) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) seed(i - 1); if (x < W - 1) seed(i + 1); if (y > 0) seed(i - W); if (y < H - 1) seed(i + W);
  }
  // Keep only the largest connected shape: logos, captions and colour swatches in catalogue photos are separate
  // shapes, so they drop out without hand-drawn logo boxes.
  const comp = new Int32Array(W * H).fill(-1), sizes = [];
  for (let i = 0; i < W * H; i++) {
    if (outside[i] || comp[i] >= 0) continue;
    const id = sizes.length; let n = 0;
    comp[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop(), x = j % W, y = (j / W) | 0; n++;
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
        if (k >= 0 && !outside[k] && comp[k] < 0) { comp[k] = id; stack.push(k); }
      }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  const mask = Buffer.alloc(W * H);
  let area = 0;
  for (let i = 0; i < W * H; i++) if (comp[i] === keep) { mask[i] = 255; area++; }
  await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(dir, `${v.name}.png`));
  await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).png().toFile(path.join(dir, `${v.name}-mask.png`));
  console.log(`${v.name}: ${W}x${H}, product ${((100 * area) / (W * H)).toFixed(1)}% of frame`);
}
