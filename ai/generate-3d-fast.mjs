// Image → 3D (GLB) via Stable Fast 3D on Hugging Face — a few seconds of GPU, so it fits the free daily quota.
// Usage (from ai/): node generate-3d-fast.mjs [imagePathOrUrl] [outName]
// Then copy out/<name>.glb to web/public/models/ and set `heroModel` in web/src/data/site.ts.
import { Client, handle_file } from "@gradio/client";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

// Default: Morandi large basin mixer in rose gold — the full product on white (warm metal mattes cleanly).
const [image = "https://www.aquilo.in/wp-content/uploads/2022/01/AQ-2103_RGD_BASIN_MIXER_LARGE.webp", name = "morandi-mixer"] = process.argv.slice(2);
await mkdir(new URL("./out/", import.meta.url), { recursive: true });

// Pad the product onto a square white canvas; the Space's own background removal (rembg) does the matting —
// a naive white→alpha key would also erase polished-metal highlights.
const src = image.startsWith("http") ? Buffer.from(await (await fetch(image, { headers: { "User-Agent": "Mozilla/5.0" } })).arrayBuffer()) : await readFile(image);
const meta = await sharp(src).metadata();
const side = Math.round(Math.max(meta.width, meta.height) * 1.1);
const rgba = await sharp(src).flatten({ background: "#ffffff" })
  .extend({ top: Math.floor((side - meta.height) / 2), bottom: Math.ceil((side - meta.height) / 2), left: Math.floor((side - meta.width) / 2), right: Math.ceil((side - meta.width) / 2), background: "#ffffff" })
  .resize(1024, 1024).png().toBuffer();
await writeFile(new URL(`./out/${name}-input.png`, import.meta.url), rgba);

const client = await Client.connect("stabilityai/stable-fast-3d", process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {});
const t0 = Date.now();
// The Space keeps the prepared image in session state: call once as "Remove Background", then as "Run".
const input = handle_file(new Blob([rgba], { type: "image/png" }));
const call = (button) => client.predict("/run_button", [button, input, 0.85, "None", -1, 1024]);
await call("Remove Background");
const res = await call("Run");
const flat = JSON.stringify(res.data);
const glbUrl = (flat.match(/"url":"([^"]+\.glb)"/) ?? [])[1];
if (!glbUrl) throw new Error("no GLB in response: " + flat.slice(0, 600));
const out = new URL(`./out/${name}.glb`, import.meta.url);
await writeFile(out, Buffer.from(await (await fetch(glbUrl)).arrayBuffer()));
console.log("✓", name, `${Math.round((Date.now() - t0) / 1000)}s →`, decodeURI(out.pathname));
