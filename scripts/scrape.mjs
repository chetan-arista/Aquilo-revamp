// Scrapes the live aquilo.in WordPress/WooCommerce site via its public REST API.
// Usage: node scripts/scrape.mjs [--data-only]
// Output: scraped/data/*.json (structured content) and scraped/media/** (original files).
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

const BASE = "https://www.aquilo.in";
const OUT = new URL("../scraped/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const UA = { "User-Agent": "Mozilla/5.0 (Aquilo revamp asset sync)" };
const dataOnly = process.argv.includes("--data-only");

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return { body: await res.json(), headers: res.headers };
    if (attempt === 4) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

async function getAll(path, fields) {
  const items = [];
  for (let page = 1; ; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}${path}${sep}per_page=100&page=${page}${fields ? `&_fields=${fields}` : ""}`;
    const { body, headers } = await getJson(url);
    items.push(...body);
    const totalPages = Number(headers.get("x-wp-totalpages") || 1);
    process.stdout.write(`\r${path} page ${page}/${totalPages}   `);
    if (page >= totalPages || body.length === 0) break;
  }
  console.log(`\n${path}: ${items.length}`);
  return items;
}

const save = (name, data) => writeFile(join(OUT, "data", name), JSON.stringify(data, null, 2));

await mkdir(join(OUT, "data"), { recursive: true });

const [categories, products, media, pages] = await Promise.all([
  getAll("/wp-json/wc/store/v1/products/categories"),
  getAll("/wp-json/wc/store/v1/products"),
  getAll("/wp-json/wp/v2/media", "id,date,slug,title,alt_text,mime_type,source_url,media_details.width,media_details.height,media_details.filesize,post"),
  getAll("/wp-json/wp/v2/pages", "id,slug,title,link,content,excerpt"),
]);

// Category tree (parent -> children) for the navigation hierarchy.
const byId = new Map(categories.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug, link: c.permalink, count: c.count, image: c.image?.src ?? null, children: [] }]));
const tree = [];
for (const c of categories) (c.parent && byId.has(c.parent) ? byId.get(c.parent).children : tree).push(byId.get(c.id));

const slim = products.map((p) => ({
  id: p.id, name: p.name, slug: p.slug, link: p.permalink, sku: p.sku,
  description: p.short_description || p.description,
  categories: p.categories.map((c) => c.slug),
  images: p.images.map((i) => i.src),
}));

await Promise.all([
  save("categories.json", categories), save("category-tree.json", tree),
  save("products.json", slim), save("media.json", media), save("pages.json", pages),
]);
console.log("Data saved to scraped/data");

if (dataOnly) process.exit(0);

// Download originals with limited concurrency; skip files already present.
const urls = [...new Set(media.map((m) => m.source_url).filter(Boolean))];
let done = 0, failed = 0;
const exists = (p) => access(p).then(() => true, () => false);
async function download(url) {
  const rel = decodeURIComponent(new URL(url).pathname.replace(/^\/wp-content\/uploads\//, ""));
  const dest = join(OUT, "media", rel);
  if (!(await exists(dest))) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(String(res.status));
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    } catch (e) { failed++; console.error(`\nfail ${url}: ${e.message}`); }
  }
  process.stdout.write(`\rmedia ${++done}/${urls.length} (failed ${failed})   `);
}
const queue = [...urls];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await download(queue.shift()); }));
console.log(`\nMedia done: ${done - failed} ok, ${failed} failed`);
