// Exports the client's real product photography as upload-ready images for Google Flow (Veo).
// Start frames → frames/ (JPG, ≤3840 px). Product cut-outs for "Ingredients to Video" → ingredients/ (PNG on white).
// Usage (from ai/): node flow/export-frames.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const MEDIA = new URL("../../scraped/media/", import.meta.url);
const path = (u) => decodeURI(u.pathname).replace(/^\/(\w:)/, "$1");
const src = (p) => path(new URL(p, MEDIA));

const frames = {
  "G2-exclusive-rosegold-basin": "2022/09/AQX-SS-8338-BRG-GM.png",
  "G3-altier-mist": "2022/04/3-1-scaled.webp",
  "S1-basin-mixer-marble": "2023/02/basin-mixer-min.jpg",
  "S2-shower-rain": "2026/02/DSC_9549_1200x1632.jpg",
  "S3-shower-raincurtain": "2026/02/DSC_9550_1200x1632.jpg",
  "S4-shower-cascade": "2026/02/DSC_9552_1200x1632.jpg",
  "S5-ceiling-rain-dark": "2022/08/edited-1.jpg",
  "S6-spa-sunset": "2022/03/WHALE-1st-pg.webp",
  "S7-bathtub-garden": "2022/03/A410102-scaled.jpg",
  "S8-showroom": "2022/08/490A1318.webp",
};
const ingredients = {
  "I1-moonlight-brushed-rosegold-wall-mixer": "2023/04/AQ-3105-BRG.webp",
  "I2-morandi-rosegold-tall-mixer": "2022/01/AQ-2103_RGD_BASIN_MIXER_LARGE.webp",
  "I3-champagne-gold-tall-mixer": "2026/02/AQ-21011-CG_1200x1744.jpg",
  "I4-silkrain-steelgrey-mixer": "2023/04/AQ-21010-SG.webp",
  "I5-black-rosegold-freestanding-basin": "2022/09/AQX-SS-8338-BRG-GM.png",
  "I6-concrete-vessel-basin": "2022/04/AQX-CB-101-D5-scaled.jpg",
};

const outDir = new URL("./", import.meta.url);
await mkdir(new URL("frames/", outDir), { recursive: true });
await mkdir(new URL("ingredients/", outDir), { recursive: true });

for (const [name, file] of Object.entries(frames)) {
  await sharp(src(file)).rotate().flatten({ background: "#000000" })
    .resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true }).toFile(path(new URL(`frames/${name}.jpg`, outDir)));
  console.log("frame", name);
}
for (const [name, file] of Object.entries(ingredients)) {
  await sharp(src(file)).rotate().flatten({ background: "#ffffff" }).trim({ threshold: 10 })
    .extend({ top: 80, bottom: 80, left: 80, right: 80, background: "#ffffff" })
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .png().toFile(path(new URL(`ingredients/${name}.png`, outDir)));
  console.log("ingredient", name);
}
