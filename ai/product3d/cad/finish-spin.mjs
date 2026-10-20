// CAD route, step 6: Blender's transparent frames → web spin frames and a video loop.
// Usage (from ai/): node product3d/cad/finish-spin.mjs <product dir> [--background #ffffff]
// cad-spin/NNN.png → cad-spin-web/NNN.webp (on the background colour), spin.json (frame count and pace, read by
// the viewer), cad-spin.mp4 and cad-spin.webm: one seamless turn in --turn seconds (default 6, the same pace as
// ProductSpin). 144 frames give 24 fps of real frames; fewer are blended up to 30 fps. Motion interpolation was
// tried and ghosts on chrome reflections, so it is not used.
import sharp from "sharp";
import ffmpeg from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith("--")));
const background = args.includes("--background") ? args[args.indexOf("--background") + 1] : "#ffffff";
const turn = Number(args.includes("--turn") ? args[args.indexOf("--turn") + 1] : 6);
const src = path.join(dir, "cad-spin"), out = path.join(dir, "cad-spin-web");
// Older runs named frames NN.png (72 a turn): they are the even angles of a 144 frame turn.
for (const f of await readdir(src)) {
  const m = f.match(/^(\d{2})\.png$/);
  if (m) await rename(path.join(src, f), path.join(src, `${String(Number(m[1]) * 2).padStart(3, "0")}.png`));
}
const frames = (await readdir(src)).filter((f) => /^\d{3}\.png$/.test(f)).sort();
// A doubled turn is only usable once every in-between frame exists; until then publish the even ones.
const complete = frames.every((f, i) => Number(f.slice(0, 3)) === i);
const use = complete ? frames : frames.filter((f) => Number(f.slice(0, 3)) % 2 === 0);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const [i, f] of use.entries()) await sharp(path.join(src, f)).flatten({ background }).webp({ quality: 86 }).toFile(path.join(out, `${String(i).padStart(3, "0")}.webp`));
await writeFile(path.join(dir, "spin.json"), JSON.stringify({ frames: use.length, turnSeconds: turn }));

const rate = use.length / turn;
const input = ["-framerate", String(rate), "-i", path.join(out, "%03d.webp")];
const even = ["-vf", `${rate < 23 ? "framerate=fps=30," : ""}scale=trunc(iw/2)*2:trunc(ih/2)*2`];
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...input, ...even, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", path.join(dir, "cad-spin.mp4")]);
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...input, ...even, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", path.join(dir, "cad-spin.webm")]);
console.log(`${use.length} frames${complete ? "" : ` (in-between frames still missing)`} at ${rate.toFixed(0)} fps → cad-spin-web/, spin.json, cad-spin.mp4, cad-spin.webm`);
