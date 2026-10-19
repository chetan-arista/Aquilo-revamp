// Exports the best photography from the client's catalogue PDFs (extracted with PyMuPDF into
// ../scraped/catalogue/) to public/media/cat-*.webp at up to 2800 px, quality 90.
// Usage (from web/): node scripts/export-catalogue.mjs
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../scraped/catalogue/", import.meta.url));
const OUT = fileURLToPath(new URL("../public/media/", import.meta.url));
for (const f of (await readdir(SRC)).filter((f) => f.endsWith(".png"))) {
  const name = f.replace(/\.png$/, "");
  const info = await sharp(SRC + f).rotate().resize(2800, 2800, { fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb").webp({ quality: 90, effort: 5 }).toFile(`${OUT}cat-${name}.webp`);
  console.log(`cat-${name}`, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}
