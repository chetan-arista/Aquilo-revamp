// Turns raw AI clips into seamless, web-ready loops for web/public/media/video.
// Crossfades the tail into the head (no visible jump on loop), upscales gently, encodes H.264 + VP9, writes a poster.
// Usage (from ai/): node encode-web.mjs <in.mp4[@trimSeconds]> [...]  e.g. out/clip.mp4@1.2 drops a 1.2 s lead-in   (needs ffmpeg on PATH or FFMPEG=/path/to/ffmpeg)
import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { mkdirSync } from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const OUT = new URL("../web/public/media/video/", import.meta.url);
const out = (f) => decodeURI(new URL(f, OUT).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out(""), { recursive: true });

for (const arg of process.argv.slice(2)) {
  // Optional "@seconds" drops a lead-in (e.g. frames where the AI still shows the source photo's backdrop).
  const [file, trim = "0"] = arg.split("@");
  const id = basename(file, ".mp4");
  // ffmpeg prints stream info to stderr and exits non-zero when given no output — read the duration from that.
  let info = "";
  try { execFileSync(FF, ["-hide_banner", "-i", file], { stdio: "pipe" }); } catch (e) { info = String(e.stderr); }
  const [, h, mi, s] = info.match(/Duration: (\d+):(\d+):([\d.]+)/) ?? [];
  const dur = +h * 3600 + +mi * 60 + +s - Number(trim);
  const X = Math.min(0.7, dur / 4);
  const filter =
    `[0]split[a][b];[a]trim=start=${X},setpts=PTS-STARTPTS[main];[b]trim=0:${X},setpts=PTS-STARTPTS[head];` +
    `[main][head]xfade=transition=fade:duration=${X}:offset=${(dur - 2 * X).toFixed(3)},` +
    `scale=iw*1.5:ih*1.5:flags=lanczos,unsharp=5:5:0.6,fps=24,format=yuv420p[v]`;
  execFileSync(FF, ["-y", "-loglevel", "error", "-ss", trim, "-i", file, "-filter_complex", filter, "-map", "[v]", "-an",
    "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-movflags", "+faststart", out(`${id}.mp4`)]);
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", out(`${id}.mp4`), "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", out(`${id}.webm`)]);
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", out(`${id}.mp4`), "-frames:v", "1", "-q:v", "3", out(`${id}.jpg`)]);
  console.log("✓", id, `${dur.toFixed(2)}s → loop ${(dur - X).toFixed(2)}s`);
}
