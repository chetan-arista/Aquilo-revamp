// Four product photos (front, right, back, left) → a 3D mesh, using the free Hunyuan3D-2mv Space.
// Usage (from ai/):
//   node product3d/make3d.mjs <product dir> [--space tencent/Hunyuan3D-2mv] [--steps 30] [--octree 256]
// The product dir holds front.png, right.png, back.png and left.png (see prepare-views.mjs), and gets
// mesh.glb + mesh.json (stats, seed, timing). Needs HF_TOKEN in the environment (a free account works,
// within its daily ZeroGPU quota). If the quota is used up, run the same model on Kaggle / Colab /
// Modal instead (see rich/01-3d-product-view.md).
import { Client, handle_file } from "@gradio/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
if (!dir) throw new Error("usage: node product3d/make3d.mjs <product dir>");
const space = opt("space", "tencent/Hunyuan3D-2mv");

const view = async (name) => handle_file(new Blob([await readFile(path.join(dir, `${name}.png`))], { type: "image/png" }));
const client = await Client.connect(space, { hf_token: process.env.HF_TOKEN });
const t0 = Date.now();
const res = await client.predict("/shape_generation", {
  caption: "",
  image: null,
  mv_image_front: await view("front"),
  mv_image_back: await view("back"),
  mv_image_left: await view("left"),
  mv_image_right: await view("right"),
  steps: Number(opt("steps", 30)),
  guidance_scale: 5,
  seed: 1234,
  octree_resolution: Number(opt("octree", 256)),
  check_box_rembg: true,
  num_chunks: 8000,
  randomize_seed: false,
});
const [file, , stats, seed] = res.data;
const f = file?.value ?? file; // gradio wraps the file in an "update" object
const url = f?.url ?? f?.path;
const glb = Buffer.from(await (await fetch(url, { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } })).arrayBuffer());
await writeFile(path.join(dir, "mesh.glb"), glb);
await writeFile(path.join(dir, "mesh.json"), JSON.stringify({ space, seconds: Math.round((Date.now() - t0) / 1000), seed, stats, bytes: glb.length }, null, 1));
console.log(path.basename(dir), "mesh.glb", Math.round(glb.length / 1024), "KB in", Math.round((Date.now() - t0) / 1000), "s");
