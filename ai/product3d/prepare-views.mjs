// Picks the four views from a 72 frame turntable (0, 90, 180, 270 degrees) and squares them up.
// Usage (from ai/): node product3d/prepare-views.mjs <product dir>
// <product dir>/spin/NN_*.jpg (frame NN = NN x 5 degrees) → front.png, right.png, back.png, left.png.
// With real client photos, just name them front / right / back / left (same light and distance).
// Frame 18 shows the product's right side (its back plate is on the image's right), so 18 = right.
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const dir = process.argv[2];
const frames = (await readdir(path.join(dir, "spin"))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const step = frames.length / 4;
const views = { front: 0, right: step, back: step * 2, left: step * 3 };
// Same square canvas for all four, so scale and centre stay consistent between views.
const metas = await Promise.all(frames.map((f) => sharp(path.join(dir, "spin", f)).metadata()));
const side = Math.max(...metas.map((m) => Math.max(m.width, m.height)));
for (const [name, i] of Object.entries(views)) {
  await sharp(path.join(dir, "spin", frames[i])).resize(side, side, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" })
    .png().toFile(path.join(dir, `${name}.png`));
  console.log(path.basename(dir), name, "←", frames[i]);
}
