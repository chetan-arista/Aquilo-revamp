// Feature 1, CAD route: a few ordinary photos → product type template → CAD solid → Blender Cycles 360.
// No 3D source, no turntable, no AI (see rich/01-3d-product-view.md, "CAD route").
// Usage (from ai/): node product3d/cad/pipeline.mjs <product dir> [--stage process|render] [--frames 144]
//                   [--size 640] [--samples 32] [--no-render]
// Needs Blender 4.5 (portable is fine) with build123d in its Python: set BLENDER to blender.exe.
//
// <product dir>/views.json: "template", the photos (files, flips, logo boxes, camera pitch range), the known
// size ("heightMm", "widthMm", "headDiameterMm" …), the finish and the render look. product.json (optional): the
// name, category and finishes shown in the lab once published.
//   stage process (about 30 s)
//     prepare.mjs                    → <view>.png, <view>-mask.png
//     fit: basin-mixer               templates/basin-mixer/profile.mjs + fit.mjs  (measured from a side photo)
//          other templates           fit-template.mjs                             (fitted by outline, one photo is enough)
//                                    → fit.json, fit-<view>.png
//     build_cad.py (templates/<t>/build.py) → model.step, model-cad.glb, cad.json
//     optimize-glb.mjs               → model-web.glb          for the site: merged, welded, simplified (0.08 mm), meshopt
//     score.mjs                      → score.json             CAD outline against every photo
//   stage render (minutes; one Blender at a time, waits for .render.lock in the products folder)
//     render_blender.py              → cad-spin/NNN.png       Cycles turntable, frame 0 = the first photo's angle
//     finish-spin.mjs                → cad-spin-web/NNN.webp, spin.json, cad-spin.mp4, cad-spin.webm
//     publish                        → the product is added to ../manifest.json (shown in /lab/cad)
// Without --stage both run; the admin flow (/lab/admin) runs "process", waits for approval, then "render".
// Progress goes to <product dir>/status.json.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a) && !["process", "render"].includes(a)) ?? "");
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const stage = opt("stage", "all");
const blender = process.env.BLENDER;
if (!blender || !existsSync(blender)) throw new Error("Set BLENDER to blender.exe (Blender 4.5 LTS with build123d installed in its Python)");
const blenderPython = path.join(path.dirname(blender), "4.5", "python", "bin", process.platform === "win32" ? "python.exe" : "python3.11");
const spec = JSON.parse(readFileSync(path.join(dir, "views.json"), "utf8"));
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const run = (cmd, a) => execFileSync(cmd, a, { stdio: "inherit" });
const node = (script, ...a) => run(process.execPath, [here(script), dir, ...a]);
const frames = Number(opt("frames", "144"));

// Status for the admin page.
const statusFile = path.join(dir, "status.json");
const STEPS = [
  ["prepare", "Clean the photos"], ["fit", "Fit the template"], ["cad", "Build the CAD solid"], ["web", "Make the web model"],
  ["score", "Check against the photos"], ["render", "Render the 360"], ["video", "Web frames and video"], ["publish", "Publish"],
];
const status = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, "utf8"))
  : { state: "processing", steps: STEPS.map(([key, label]) => ({ key, label, state: "pending" })) };
const save = (patch = {}) => { Object.assign(status, patch, { updatedAt: new Date().toISOString() }); writeFileSync(statusFile, JSON.stringify(status, null, 2)); };
function step(key, fn) {
  const s = status.steps.find((x) => x.key === key);
  Object.assign(s, { state: "running", startedAt: new Date().toISOString(), endedAt: undefined });
  save();
  try {
    fn();
    Object.assign(s, { state: "done", endedAt: new Date().toISOString() });
    save();
  } catch (e) {
    Object.assign(s, { state: "failed", endedAt: new Date().toISOString() });
    save({ state: "failed", error: `${s.label} failed: ${String(e.message ?? e).split("\n")[0]}` });
    process.exit(1);
  }
}

// One Blender at a time: the CPU is the render farm.
const lockFile = path.join(path.dirname(dir), ".render.lock");
function withRenderLock(fn) {
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (;;) {
    if (existsSync(lockFile)) {
      const pid = Number(readFileSync(lockFile, "utf8"));
      if (alive(pid)) { save({ state: "queued" }); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000); continue; }
      unlinkSync(lockFile);
    }
    try { writeFileSync(lockFile, String(process.pid), { flag: "wx" }); break; } catch { /* another job won the race */ }
  }
  try { fn(); } finally { try { unlinkSync(lockFile); } catch {} }
}

function publish() {
  const manifestFile = path.join(path.dirname(dir), "manifest.json");
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : [];
  const meta = JSON.parse(readFileSync(here(`./templates/${spec.template}/meta.json`), "utf8"));
  const product = existsSync(path.join(dir, "product.json")) ? JSON.parse(readFileSync(path.join(dir, "product.json"), "utf8")) : {};
  const slug = path.basename(dir);
  const entry = {
    slug, category: product.category ?? meta.label, name: product.name ?? spec.product ?? slug,
    finishes: product.finishes ?? meta.finishes, mount: meta.mount,
    photos: spec.views.map((v) => ({ name: v.name, note: v.note ?? v.name })),
  };
  const i = manifest.findIndex((x) => x.slug === slug);
  if (i >= 0) manifest[i] = { ...manifest[i], ...entry }; else manifest.push(entry);
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}

console.log(`\n=== ${path.basename(dir)} (${spec.template}), stage ${stage}`);
if (stage === "all" || stage === "process") {
  save({ state: "processing", error: undefined });
  step("prepare", () => node("./prepare.mjs"));
  step("fit", () => {
    if (spec.template === "basin-mixer") {
      node("./templates/basin-mixer/profile.mjs", "--height-mm", String(spec.heightMm ?? 160));
      node("./templates/basin-mixer/fit.mjs");
    } else node("./fit-template.mjs");
  });
  step("cad", () => run(blenderPython, [here("./build_cad.py"), dir]));
  step("web", () => node("./optimize-glb.mjs"));
  step("score", () => node("./score.mjs"));
  const score = JSON.parse(readFileSync(path.join(dir, "score.json"), "utf8"));
  // Below 85 % the outline is visibly off: the admin should look closely, or retake the photo.
  save({ state: stage === "process" ? "review" : "processing", score: score.mean, needsAttention: score.mean < 0.85 });
}
if ((stage === "all" && !args.includes("--no-render")) || stage === "render") {
  withRenderLock(() => {
    save({ state: "rendering", render: { frames } });
    step("render", () => run(blender, ["-b", "-P", here("./render_blender.py"), "--", dir, "--frames", String(frames), "--size", opt("size", "640"), "--samples", opt("samples", "32")]));
  });
  step("video", () => node("./finish-spin.mjs"));
  step("publish", publish);
  save({ state: "published" });
}
