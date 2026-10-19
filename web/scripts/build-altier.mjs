// Builds the AQUILO Altier assets from the scraped catalogue (../scraped):
//   1. Curated collections: the luxury finishes of the real AQUILO range, with each product cut out of
//      its white studio background (transparent WebP) so it can sit on Altier's dark surfaces.
//   2. A Nero Marquina style black marble texture (and its roughness map) for the 3D counters and floor.
// Writes public/media/altier/** and src/data/altier-collections.json.
// Usage (from web/): node scripts/build-altier.mjs
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath as fp } from "node:url";

const ROOT = new URL("../../", import.meta.url);
const MEDIA = new URL("scraped/media/", ROOT);
const OUT = new URL("../public/media/altier/", import.meta.url);
const TEX = new URL("../public/textures/", import.meta.url);
const DATA = new URL("../src/data/altier-collections.json", import.meta.url);

/** Curated Altier collections: name, story and the WordPress category slugs that hold their pieces. */
const COLLECTIONS = [
  { slug: "moonlight", name: "Moonlight", finish: "Brushed Rose Gold", cores: ["moonlight-brushed-rose-gold-series", "moonlight-rose-gold-series"],
    line: "Soft geometry with a quiet, moonlit glow.", story: "Moonlight softens the hard edge of metal. Rounded planes catch light the way water does, and the brushed rose gold finish warms under every lamp.", tone: "#2a201d", accent: "#d9a58e" },
  { slug: "morandi", name: "Morandi", finish: "Black Matt and Rose Gold", cores: ["morandi-black-matt-series", "morandi-rose-gold-series"],
    line: "Pure cylinders, perfectly balanced.", story: "Named for the painter of stillness. Morandi reduces the mixer to a column and a gesture, in a velvet black or a blush of rose gold.", tone: "#18181a", accent: "#c9a08c" },
  { slug: "champagne-gold", name: "Champagne Gold", finish: "Champagne Gold", cores: ["champagne-gold"],
    line: "Architectural squares in a warm, celebratory gold.", story: "Precise squares and long flat spouts, finished in a pale champagne gold that reads as light rather than colour.", tone: "#241f17", accent: "#d8c08f" },
  { slug: "pei", name: "PEI Gold", finish: "Gold", cores: ["pei-gold-series"],
    line: "Faceted, ornamental, unapologetically gold.", story: "Facets cut like a jewel and polished to a deep gold. PEI is the most ornamental line in the house, made for rooms that celebrate.", tone: "#221c12", accent: "#e0bf7a" },
  { slug: "silk-rain", name: "Silk Rain", finish: "Steel Grey", cores: ["silk-rain-steel-grey-series"],
    line: "A blade of water, falling like silk.", story: "Silk Rain draws water into a single clear blade. Steel grey keeps it architectural, almost mineral, against stone and concrete.", tone: "#17191b", accent: "#a9b0b5" },
  { slug: "liberty", name: "Liberty", finish: "Brushed Brass", cores: ["liberty-brush-brass-series"],
    line: "Classical proportions, re-cut for the modern bath.", story: "Liberty keeps the cross handles and generous curves of classic bathrooms, re-proportioned and brushed to a soft, lived-in brass.", tone: "#211d16", accent: "#cdb07c" },
  { slug: "copper", name: "Copper", finish: "Oil Rubbed Copper", cores: ["copper-series"],
    line: "Dark copper that deepens with every touch.", story: "An oil rubbed copper finish, dark at rest and glowing at the edges, that ages gracefully with the hands that use it.", tone: "#1e1612", accent: "#c08a64" },
];

const MAX_PIECES = 14;
const decode = (s) => s.replace(/&#215;/g, "x").replace(/&amp;/g, "&").replace(/&#8211;|&#8212;/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
const strip = (h) => decode(h.replace(/<[^>]+>/g, "\n")).split("\n").map((s) => s.trim()).filter(Boolean);
const title = (s) => s.toLowerCase().replace(/\b(\w)/g, (c) => c.toUpperCase()).replace(/\bWith\b/g, "with").replace(/\bAnd\b/g, "and").replace(/Singlr/i, "Single").replace(/Ppaer/i, "Paper").replace(/Tower Bar/i, "Towel Bar");
const isCode = (s) => /^(AQ|FH)[-\s]?\d/i.test(s.trim());

function describe(p) {
  const lines = strip(p.description || "");
  const field = (k) => lines.map((l) => l.match(new RegExp(`^${k}\\s*:\\s*(.+)$`, "i"))?.[1]).find(Boolean);
  const code = (field("Product Code") || (isCode(p.name) ? p.name : "")).replace(/\s*[–—-]\s*/g, "-").replace(/\s+/g, " ").trim();
  let type = field("Type") || (!isCode(p.name) ? p.name : lines.find((l) => !/:/.test(l) || /^size/i.test(l) === false) || "");
  type = type.replace(/\s*Size\s*:.*$/i, "").replace(/\s*Spout length.*$/i, "").trim();
  const size = (lines.join(" ").match(/Size\s*:\s*([^\n]+?)(?:$|Spout|\s{2})/i)?.[1] || "").trim();
  return { code, type: title(type || "Fitting"), size };
}

const AREA = [[/shower|head|rain|thermostat|diverter|valve|health faucet/i, "Shower"], [/basin|mixer|spout|faucet|tap|sink/i, "Basin"], [/towel|robe|paper|tumbler|soap|brush|hook|ring|rack|shelf|holder/i, "Accessories"]];
const areaOf = (type) => AREA.find(([re]) => re.test(type))?.[1] ?? "Bath";
const rank = (d) => (/basin mixer/i.test(d.type) ? 0 : /mixer|spout|faucet/i.test(d.type) ? 1 : /shower|thermostat/i.test(d.type) ? 2 : 3);

// ——— Cut-out: flood-fill the white studio background from the borders, feather and de-fringe the edge ———
async function cutout(srcPath, outPath) {
  const { data, info } = await sharp(fp(srcPath)).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  // Background colour = median of the border.
  const border = [];
  for (let x = 0; x < W; x++) border.push(px(x), px((H - 1) * W + x));
  for (let y = 0; y < H; y++) border.push(px(y * W), px(y * W + W - 1));
  const med = [0, 1, 2].map((c) => border.map((b) => b[c]).sort((a, b) => a - b)[border.length >> 1]);
  const dist = (i) => Math.hypot(data[i * 4] - med[0], data[i * 4 + 1] - med[1], data[i * 4 + 2] - med[2]);
  const T = 26; // background tolerance
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (i) => { if (!bg[i] && dist(i) < T) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  // Enclosed holes (inside a towel ring, an oval frame): large background-coloured islands are background too.
  const seen = new Uint8Array(W * H);
  for (let s0 = 0; s0 < W * H; s0++) {
    if (bg[s0] || seen[s0] || dist(s0) >= T * 0.7) continue;
    const comp = [s0]; seen[s0] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && !seen[j] && !bg[j] && dist(j) < T * 0.7) { seen[j] = 1; comp.push(j); }
    }
    if (comp.length > W * H * 0.004) for (const i of comp) bg[i] = 1;
  }
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    let a = 255;
    if (bg[i]) a = 0;
    else {
      // Near the boundary, alpha follows the distance from the background colour (anti-aliased edge).
      const x = i % W, y = (i / W) | 0;
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && bg[yy * W + xx]) { edge = true; break; }
      }
      if (edge) a = Math.max(0, Math.min(255, ((dist(i) - T * 0.6) / (T * 2.2)) * 255));
    }
    const f = a / 255;
    for (let c = 0; c < 3; c++) {
      // Remove the white fringe: un-blend the background from semi-transparent edge pixels.
      const v = f > 0 && f < 1 ? (data[i * 4 + c] - (1 - f) * med[c]) / f : data[i * 4 + c];
      out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    out[i * 4 + 3] = Math.round(a);
  }
  const img = sharp(out, { raw: { width: W, height: H, channels: 4 } });
  const t = await img.clone().trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 95, effort: 5 }).toFile(fp(outPath));
  return { w: t.width, h: t.height };
}

// ——— Marble: domain-warped fractal noise veins on black ———
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 6) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

async function marble() {
  const N = 2048;
  const col = Buffer.alloc(N * N * 3), rough = Buffer.alloc(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x / N) * 2.2, v = (y / N) * 2.2;
    // Domain-warped ridged noise: a few long, crisp veins (Nero Marquina) over soft charcoal clouds.
    const wx = fbm(u + 3.1, v + 1.7, 5), wy = fbm(u - 2.3, v + 4.9, 5);
    const n = fbm(u * 1.3 + 1.8 * wx, v * 0.8 + 1.8 * wy, 6);
    const ridge = 1 - Math.abs(2 * n - 1);
    const vein = Math.pow(Math.max(0, ridge), 36);
    const n2 = fbm(u * 3.1 + 2.4 * wy + 7, v * 2.2 + 2.4 * wx, 5);
    const fine = Math.pow(Math.max(0, 1 - Math.abs(2 * n2 - 1)), 60) * 0.45;
    const cloud = fbm(u * 1.1 + 9, v * 1.1, 5);
    const base = 9 + cloud * 13;
    const w = Math.min(1, vein * 0.72 + fine);
    const i = y * N + x;
    col[i * 3] = Math.round(base + (226 - base) * w);
    col[i * 3 + 1] = Math.round(base + 1 + (220 - base) * w);
    col[i * 3 + 2] = Math.round(base + 2 + (212 - base) * w);
    rough[i] = Math.round(70 + cloud * 40 - w * 30); // veins polish slightly differently
  }
  await sharp(col, { raw: { width: N, height: N, channels: 3 } }).webp({ quality: 90 }).toFile(fp(new URL("marble-nero.webp", TEX)));
  await sharp(rough, { raw: { width: N, height: N, channels: 1 } }).resize(1024).webp({ quality: 85 }).toFile(fp(new URL("marble-nero-rough.webp", TEX)));
}

const products = JSON.parse(await readFile(new URL("scraped/data/products.json", ROOT), "utf8"));
const matches = (cats, core) => cats.some((c) => c === core || c.endsWith(`-${core}`) || c.startsWith(`${core}-`));
const result = [];
for (const col of COLLECTIONS) {
  await mkdir(new URL(`${col.slug}/`, OUT), { recursive: true });
  const seen = new Set();
  const items = products
    .filter((p) => p.images?.length && col.cores.some((core) => matches(p.categories, core)))
    .map((p) => ({ p, d: describe(p), img: p.images[0].split("/uploads/")[1] }))
    .filter(({ img }) => img && existsSync(new URL(img, MEDIA)) && !seen.has(img) && seen.add(img))
    .sort((a, b) => rank(a.d) - rank(b.d))
    .slice(0, MAX_PIECES);
  const pieces = [];
  for (const { p, d, img } of items) {
    const file = `${p.slug}.webp`;
    const size = await cutout(new URL(img, MEDIA), new URL(`${col.slug}/${file}`, OUT));
    pieces.push({ slug: p.slug, type: d.type, code: d.code, size: d.size, area: areaOf(d.type), image: `/media/altier/${col.slug}/${file}`, w: size.w, h: size.h, source: p.link });
    process.stdout.write(".");
  }
  const { cores, ...rest } = col;
  result.push({ ...rest, count: pieces.length, hero: pieces[0]?.image ?? null, pieces, source: `https://www.aquilo.in/product-category/${cores[0]}/` });
  console.log(` ${col.name}: ${pieces.length}`);
}
await writeFile(DATA, JSON.stringify(result, null, 1));
await mkdir(TEX, { recursive: true });
await marble();
console.log("wrote", fp(DATA), "and textures");
