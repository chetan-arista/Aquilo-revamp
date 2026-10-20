// Real turntable photos → web spin frames (route A1: no AI). Usage (from ai/):
//   node product3d/prepare-spin.mjs <product dir> [--size 900]
// <product dir>/spin/*.jpg (in turntable order) → <product dir>/spin-web/NN.webp, all on one square canvas
// so the product never jumps between frames.
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const size = Number(args.includes("--size") ? args[args.indexOf("--size") + 1] : 900);
const frames = (await readdir(path.join(dir, "spin"))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
await mkdir(path.join(dir, "spin-web"), { recursive: true });
let bytes = 0;
for (const [i, f] of frames.entries()) {
  const info = await sharp(path.join(dir, "spin", f)).resize(size, size, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" })
    .webp({ quality: 82 }).toFile(path.join(dir, "spin-web", `${String(i).padStart(2, "0")}.webp`));
  bytes += info.size;
}
console.log(path.basename(dir), frames.length, "frames,", Math.round(bytes / 1024), "KB total");
