// AI model → 360 spin frames + video loop, filmed in the browser with the site's own ProductOrbit.
// Usage (from ai/, with the web dev server running on :3000):
//   node product3d/render-spin.mjs <slug> [--frames 72] [--size 900] [--base http://localhost:3000]
// Opens /lab/3d/render?model=…/model.glb, turns the model to each angle (window.__setAzimuth), screenshots,
// writes test-assets/abo/products/<slug>/ai-spin/NN.webp, then ai-spin.mp4 and ai-spin.webm (ffmpeg).
import { chromium } from "playwright";
import sharp from "sharp";
import ffmpeg from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const frames = Number(opt("frames", 72)), size = Number(opt("size", 900)), base = opt("base", "http://localhost:3000");
const dir = path.join(fileURLToPath(new URL("../../test-assets/abo/products/", import.meta.url)), slug);
const out = path.join(dir, "ai-spin");
await mkdir(out, { recursive: true });

// GPU when there is one; software GL otherwise (slower, same result).
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: size, height: size } });
await page.addInitScript(() => { try { sessionStorage.setItem("aquilo-intro-seen", "1"); } catch {} });
await page.goto(`${base}/lab/3d/render?model=${encodeURIComponent(`/lab/3d/asset/${slug}/model.glb`)}`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => window.__spinReady === true && typeof window.__setAzimuth === "function", null, { timeout: 180000 });
await page.waitForTimeout(1500);
// Keep the Next.js dev badge out of the frames.
await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((n) => n.remove()));
const frame2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
for (let i = 0; i < frames; i++) {
  await page.evaluate((d) => window.__setAzimuth(d), (i * 360) / frames);
  await frame2();
  const buf = await page.screenshot({ timeout: 120000 });
  await sharp(buf).webp({ quality: 82 }).toFile(path.join(out, `${String(i).padStart(2, "0")}.webp`));
  if (i % 12 === 0) process.stdout.write(`${i} `);
}
await browser.close();

// Video loop: two turns at 24 fps (6 s), H.264 + VP9.
const input = ["-framerate", "24", "-stream_loop", "1", "-i", path.join(out, "%02d.webp")];
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", path.join(dir, "ai-spin.mp4")]);
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...input, "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", path.join(dir, "ai-spin.webm")]);
console.log(`\n${slug}: ${frames} frames, ai-spin.mp4, ai-spin.webm`);
