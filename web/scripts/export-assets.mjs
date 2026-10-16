// Exports curated, web-optimised assets from ../scraped/media into public/media.
// Usage (from web/): node scripts/export-assets.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = new URL("../../scraped/media/", import.meta.url);
const OUT = new URL("../public/media/", import.meta.url);

// photo: full-bleed lifestyle imagery. product: white-background cut-outs (trimmed, shown with multiply blend).
const photos = {
  "hero-basin": "2023/02/basin-mixer-1.jpg",
  "rain-gold-1": "2026/02/DSC_9549_1200x1632.jpg",
  "rain-gold-2": "2026/02/DSC_9550_1200x1632.jpg",
  "rain-gold-3": "2026/02/DSC_9552_1200x1632.jpg",
  "spray-dark-1": "2022/04/3-1-scaled.webp",
  "spray-dark-2": "2022/04/3-scaled.webp",
  "rain-dark": "2022/04/AQ-3201_1_-scaled.webp",
  "ceiling-shower": "2022/08/edited-1.jpg",
  "shower-portrait": "2022/04/AQ-3232-4-R_4_-scaled.webp",
  "water-stream": "2026/02/with-water_1200x1800.jpg",
  "spa-sunset": "2022/03/WHALE-1st-pg.webp",
  "bath-garden": "2022/03/A410102-scaled.jpg",
  "bath-freestanding": "2022/08/MCL_4108-2.webp",
  "columns": "2023/12/BACKGROUND-IMAGE-3-scaled.jpg",
  "basin-dark-rosegold": "2022/09/AQX-SS-8338-BRG-GM.png",
  "basin-concrete": "2022/04/AQX-CB-101-D5-scaled.jpg",
  "basin-blue": "2022/04/AQX-CB-102-BLUE-SS-scaled.jpg",
  "basin-red": "2022/04/AQX-CB-104-RED-SS-scaled.jpg",
  "craft-casting": "2023/07/3-1-e1688465330854.png",
  "showroom-1": "2022/08/490A1318.webp",
  "showroom-2": "2022/08/490A1328.webp",
  "showroom-3": "2022/08/MCL_4731-2.webp",
  "linea-lifestyle": "2026/02/Y-ZQS-24-04-15-19-28-08_1200x1600.jpg",
};
const products = {
  "moonlight-rosegold": "2023/04/AQ-3105-BRG.webp",
  "moonlight-chrome": "2023/04/AQ-3105.webp",
  "moonlight-black": "2022/01/AQ-3105-1-MB-3-HOLE-BASIN-MIXER-scaled.webp",
  "morandi-rosegold": "2022/01/AQ-2103_RGD_BASIN_MIXER_LARGE.webp",
  "morandi-gold": "2022/01/AQ-2103_GD_BASIN_MIXER_LARGE.webp",
  "morandi-black": "2022/01/AQ-2103_MB_BASIN_MIXER_LARGE.webp",
  "liberty-chrome": "2023/04/AQ-2108-1-1-scaled.webp",
  "silkrain-steel": "2023/04/AQ-21010-SG.webp",
  "silkrain-chrome": "2023/04/AQ-11010-scaled.webp",
  "spring-chrome": "2023/04/AQ-1109-N.webp",
  "lute-chrome": "2022/01/AQ-3102.webp",
  "lean-chrome": "2022/01/AQ-3106-scaled.webp",
  "champagne-gold": "2026/02/AQ-21011-CG_1200x1744.jpg",
  "pei-gold": "2022/01/AQ-5101_GD_ROUND_TOWEL_RING.webp",
};

// Craft photos live in the right half of the old site's process infographics; crop them out.
const crops = {
  "craft-ingot": ["2023/07/1-2.png", 0.5],
  "craft-core": ["2023/07/2-2.png", 0.5],
  "craft-machining": ["2023/07/4-1-e1688465368732.png", 0.5],
  "craft-polishing": ["2023/07/5-1-e1688465425753.png", 0.5],
  "craft-plating": ["2023/07/6-e1688465502673.png", 0.5],
  "craft-assembly": ["2023/07/7-e1688465707645.png", 0.5],
};

await mkdir(OUT, { recursive: true });
const src = (p) => decodeURI(new URL(p, SRC).pathname).replace(/^\/(\w:)/, "$1");
const out = (n) => decodeURI(new URL(n, OUT).pathname).replace(/^\/(\w:)/, "$1");

for (const [name, file] of Object.entries(photos)) {
  await sharp(src(file)).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 }).toFile(out(`${name}.webp`));
  console.log("photo", name);
}
for (const [name, file] of Object.entries(products)) {
  await sharp(src(file)).flatten({ background: "#ffffff" }).trim({ threshold: 12 })
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: "#ffffff" })
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 }).toFile(out(`p-${name}.webp`));
  console.log("product", name);
}
for (const [name, [file, from]] of Object.entries(crops)) {
  const img = sharp(src(file));
  const { width, height } = await img.metadata();
  const left = Math.round(width * from);
  const half = await img.extract({ left, top: 0, width: width - left, height }).png().toBuffer();
  await sharp(half).trim({ threshold: 10 })
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(out(`${name}.webp`));
  console.log("crop", name);
}
console.log("done →", join("public", "media"));
