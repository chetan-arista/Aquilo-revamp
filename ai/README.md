# AQUILO — AI motion & 3D (free tools)

The brief asks for AI-generated videos and images **that use the actual products**. Every pipeline here starts
from the client's real product photography, so the product on screen is the real one. AI only adds motion
(water, light, camera) or geometry.

| Need | Tool | Cost | Quality | How |
|---|---|---|---|---|
| Quick motion clips | Wan 2.2 I2V Lightning (Hugging Face Space) | Free (daily ZeroGPU quota) | ~608×832, 16 fps, 3.5 s, ~30 s per clip | `npm install && node generate-free.mjs` |
| Final motion clips | **Wan 2.2 TI2V-5B in ComfyUI on Google Colab** | Free (T4 GPU) | 1280×704, 24 fps, 5 s, ~15–30 min per clip | Open `aquilo_wan22_colab.ipynb` in Colab → Run all |
| Real product 3D | TRELLIS (Hugging Face Space) | Free (same quota) | GLB mesh, re-skinned by the site | `node generate-3d.mjs` |
| Real product 3D (fast) | Stable Fast 3D (Hugging Face Space) | Free, ~8 s of GPU | Fine for chunky objects; **too lumpy for thin polished faucets** | `node generate-3d-fast.mjs` |
| Web encoding | ffmpeg | Free | seamless loop, H.264 + VP9 + poster | `node encode-web.mjs out/*.mp4` |

**Shot list:** `shots.json`, shared by the Colab notebook and the free script. Add a shot = image URL + prompt.
After editing it, run `python build_notebook.py` so the notebook picks up the change.

**Quota:** the free Hugging Face GPU quota is per-visitor and resets over time. Signing in with a free
Hugging Face account (set `HF_TOKEN`) raises it. When it runs out, use the Colab notebook.

**ComfyUI workflow:** `workflow_wan22_ti2v_api.json`. Models come from `Comfy-Org/Wan_2.2_ComfyUI_Repackaged`:
`wan2.2_ti2v_5B_fp16`, `umt5_xxl_fp8_e4m3fn_scaled` and `wan2.2_vae`. The 14B models don't fit a free T4.

**On the site** (`web/public/media/video/`): all six shots — `rain-gold`, `spa-sunset`, `basin-flow`, `spray-dark`,
`basin-rosegold` (encoded with `@1.2` to drop the white lead-in), `ceiling-rain`.

**3D faucet:** the Stable Fast 3D reconstruction of the Morandi mixer was rejected (lumpy surface on thin polished
metal; kept in `out/morandi-mixer-sf3d-rejected.glb`). The hero uses the procedural mixer. Next options, best first:
the client's CAD/3D file of a real faucet → TRELLIS when the quota resets → Spline AI (spends Spline credits).
Any GLB goes in `web/public/models/` and is enabled with `heroModel` in `web/src/data/site.ts`.
