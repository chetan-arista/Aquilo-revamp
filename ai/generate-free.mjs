// Quick, free AI motion clips via a public Wan 2.2 I2V Lightning Space on Hugging Face (ZeroGPU quota).
// Lower resolution (~608×832 @16fps) than the Colab/ComfyUI path, but takes ~30 s per clip.
// Usage (from ai/): npm install && node generate-free.mjs [shotId ...]
import { Client, handle_file } from "@gradio/client";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";

const SPACE = "Saravutw/WAN2.2_I2V_LIGHTNING_4-8step_custom";
const { shots, negative } = JSON.parse(await readFile(new URL("./shots.json", import.meta.url), "utf8"));
const only = process.argv.slice(2);
await mkdir(new URL("./out/", import.meta.url), { recursive: true });

const client = await Client.connect(SPACE, process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {});
for (const shot of shots) {
  if (only.length && !only.includes(shot.id)) continue;
  const out = new URL(`./out/${shot.id}.mp4`, import.meta.url);
  if (await access(out).then(() => true, () => false)) { console.log("skip", shot.id); continue; }
  const t0 = Date.now();
  try {
    const res = await client.predict("/generate_video", {
      input_image: handle_file(shot.image), last_image: null, prompt: shot.prompt, negative_prompt: negative,
      steps: 6, duration_seconds: 3.5, guidance_scale: 1, guidance_scale_2: 1, seed: 2010, randomize_seed: false,
      quality: 6, scheduler: "UniPCMultistep", flow_shift: 3, frame_multiplier: 16, safe_mode: false, video_component: true,
    });
    const v = res.data[0];
    const url = v?.video?.url ?? v?.url;
    await writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
    console.log("✓", shot.id, `${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (e) {
    console.log("✗", shot.id, String(e?.message ?? e).slice(0, 160), "— quota may be exhausted; retry later or use the Colab notebook");
  }
}
