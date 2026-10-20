// Feature 1 pipeline, all steps for one or more products (see rich/01-3d-product-view.md).
// Usage (from ai/, web dev server on :3000 for the last step, HF_TOKEN set for step 3):
//   node product3d/pipeline.mjs <slug> [<slug> …] [--skip-ai] [--faces 60000]
// Each product lives in test-assets/abo/products/<slug>/ (or any folder with the same layout):
//   spin/            optional turntable photos (72 frames); otherwise put front/right/back/left.png directly
//   1 prepare-views  → front.png right.png back.png left.png
//   2 prepare-spin   → spin-web/NN.webp          (route A1: real photos, no AI)
//   3 make3d         → mesh.glb, mesh.json        (Hunyuan3D-2mv on a free Hugging Face Space)
//   4 paint          → model.glb, model.json      (simplify, orient, colour from the photos; local)
//   5 render-spin    → ai-spin/NN.webp, ai-spin.mp4, ai-spin.webm (filmed from model.glb in the browser)
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const faces = args.includes("--faces") ? args[args.indexOf("--faces") + 1] : "60000";
const skipAi = args.includes("--skip-ai");
const ROOT = fileURLToPath(new URL("../../test-assets/abo/products/", import.meta.url));
const run = (script, ...a) => execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...a], { stdio: "inherit" });

for (const slug of slugs) {
  const dir = path.join(ROOT, slug);
  console.log(`\n=== ${slug}`);
  if (existsSync(path.join(dir, "spin"))) {
    run("./prepare-views.mjs", dir);
    run("./prepare-spin.mjs", dir);
  }
  if (!skipAi) run("./make3d.mjs", dir);
  run("./paint.mjs", dir, "--faces", faces);
  run("./render-spin.mjs", slug);
}
