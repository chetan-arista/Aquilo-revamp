// Improved AI route for one product: several Hunyuan3D-2mv tries at higher quality, the one whose
// silhouettes best match the four photos wins (no reference needed, so this works on real products),
// then the winner is re-run with Hunyuan3D-Paint for a real UV texture.
// Usage (from ai/, HF_TOKEN set):
//   node product3d/improve.mjs <product dir> [--seeds 1234,7,42,99] [--steps 50] [--octree 384] [--no-texture]
// Writes try-<seed>.glb for every try, improved.glb (textured winner), improved-shape.glb and improve.json.
import { Client, handle_file } from "@gradio/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readPhotos, readSurface, samplePoints, silhouetteScore } from "./lib.mjs";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const seeds = opt("seeds", "1234,7,42,99").split(",").map(Number);
const steps = Number(opt("steps", 50)), octree = Number(opt("octree", 384));
const space = opt("space", "tencent/Hunyuan3D-2mv");

const view = async (name) => handle_file(new Blob([await readFile(path.join(dir, `${name}.png`))], { type: "image/png" }));
const client = await Client.connect(space, { hf_token: process.env.HF_TOKEN });
const inputs = async (seed) => ({
  caption: "", image: null,
  mv_image_front: await view("front"), mv_image_back: await view("back"), mv_image_left: await view("left"), mv_image_right: await view("right"),
  steps, guidance_scale: 5, seed, octree_resolution: octree, check_box_rembg: true, num_chunks: 8000, randomize_seed: false,
});
const download = async (file) => {
  const f = file?.value ?? file; // gradio wraps files in an "update" object
  return Buffer.from(await (await fetch(f?.url ?? f?.path, { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } })).arrayBuffer());
};

const photos = await readPhotos(dir);
const tries = [];
for (const seed of seeds) {
  const t0 = Date.now();
  const res = await client.predict("/shape_generation", await inputs(seed));
  const file = path.join(dir, `try-${seed}.glb`);
  await writeFile(file, await download(res.data[0]));
  const score = silhouetteScore(samplePoints(await readSurface(file), 40000), photos).score;
  tries.push({ seed, score, seconds: Math.round((Date.now() - t0) / 1000), gpu: res.data[2]?.time?.total });
  console.log(path.basename(dir), "seed", seed, "outline", (score * 100).toFixed(1) + "%", `${tries.at(-1).seconds}s`);
}
const best = tries.reduce((a, b) => (b.score > a.score ? b : a));
const report = { space, steps, octree, tries, best: best.seed };

if (!args.includes("--no-texture")) {
  const t0 = Date.now();
  const res = await client.predict("/generation_all", await inputs(best.seed));
  await writeFile(path.join(dir, "improved-shape.glb"), await download(res.data[0]));
  await writeFile(path.join(dir, "improved.glb"), await download(res.data[1]));
  report.texture = { seconds: Math.round((Date.now() - t0) / 1000), gpu: res.data[3]?.time };
  console.log(path.basename(dir), "textured winner in", report.texture.seconds, "s");
}
await writeFile(path.join(dir, "improve.json"), JSON.stringify(report, null, 1));
console.log(path.basename(dir), "best seed", best.seed, "outline", (best.score * 100).toFixed(1) + "%");
