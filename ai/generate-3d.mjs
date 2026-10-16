// Image → 3D (GLB) of a real AQUILO product via the free TRELLIS Space on Hugging Face (ZeroGPU quota).
// The website re-skins the mesh with its own PBR finishes, so the scan only needs good geometry.
// Usage (from ai/): node generate-3d.mjs [imageUrl] [outName]
// Then copy out/<name>.glb to web/public/models/ and set `heroModel` in web/src/data/site.ts.
import { Client, handle_file } from "@gradio/client";
import { writeFile, mkdir } from "node:fs/promises";

// Default: Morandi large basin mixer in chrome — a clean cut-out on white, ideal for reconstruction.
const [image = "https://www.aquilo.in/wp-content/uploads/2022/01/AQ-2103.webp", name = "morandi-mixer"] = process.argv.slice(2);

await mkdir(new URL("./out/", import.meta.url), { recursive: true });
const client = await Client.connect("trellis-community/TRELLIS", process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {});
await client.predict("/start_session", {}).catch(() => {});
const t0 = Date.now();
const res = await client.predict("/generate_and_extract_glb", {
  image: handle_file(image),
  multiimages: [],
  seed: 2010,
  ss_guidance_strength: 7.5,
  ss_sampling_steps: 12,
  slat_guidance_strength: 3,
  slat_sampling_steps: 12,
  multiimage_algo: "stochastic",
  mesh_simplify: 0.9,
  texture_size: 1024,
});
const glb = res.data.find((d) => d?.url?.includes(".glb")) ?? res.data[1];
const url = glb?.url ?? glb?.value?.url;
const out = new URL(`./out/${name}.glb`, import.meta.url);
await writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
console.log("✓", name, `${Math.round((Date.now() - t0) / 1000)}s →`, decodeURI(out.pathname));
