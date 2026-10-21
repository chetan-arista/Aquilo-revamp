import { spawn } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Server side of the dev-only admin flow (/lab/admin): product types from the CAD templates, products and their
 * pipeline status from the git-ignored test-assets folder, and starting the pipeline (ai/product3d/cad).
 * Prototype only: no login and no database; the real admin panel will put these behind auth and storage.
 */
export const PRODUCTS = path.join(process.cwd(), "..", "test-assets", "faucets", "products");
const CAD = path.join(process.cwd(), "..", "ai", "product3d", "cad");
const BLENDER = process.env.BLENDER ?? "";

export type View = { name: string; label: string; required?: boolean; flip?: boolean; pitch?: [number, number] };
export type Template = {
  key: string; label: string; description: string; size: { key: string; label: string; default: number };
  views: View[]; finishes: string[]; mount: "floor" | "hanging"; render: Record<string, unknown>; secondsPerFrame: number;
};
export type Step = { key: string; label: string; state: "pending" | "running" | "done" | "failed"; startedAt?: string; endedAt?: string };
export type Status = {
  state: "processing" | "review" | "queued" | "rendering" | "published" | "failed" | "rejected";
  steps: Step[]; error?: string; score?: number; needsAttention?: boolean; render?: { frames: number }; updatedAt?: string;
};
export type ProductSummary = {
  slug: string; name: string; template: string; category: string; finishes: string[]; mount: string;
  views: string[]; status: Status | null; renderedFrames: number; secondsPerFrame: number; createdAt?: string;
};

const readJson = async <T,>(file: string): Promise<T | null> => {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; }
};

export async function listTemplates(): Promise<Template[]> {
  const dirs = await readdir(path.join(CAD, "templates"), { withFileTypes: true });
  const out: Template[] = [];
  for (const d of dirs) {
    const meta = d.isDirectory() ? await readJson<Omit<Template, "key">>(path.join(CAD, "templates", d.name, "meta.json")) : null;
    if (meta) out.push({ key: d.name, ...meta });
  }
  return out;
}

export async function listProducts(): Promise<ProductSummary[]> {
  if (!existsSync(PRODUCTS)) return [];
  const templates = new Map((await listTemplates()).map((t) => [t.key, t]));
  const out: ProductSummary[] = [];
  for (const d of await readdir(PRODUCTS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".")) continue;
    const dir = path.join(PRODUCTS, d.name);
    const views = await readJson<{ template: string; product?: string; views: { name: string }[] }>(path.join(dir, "views.json"));
    if (!views) continue;
    const product = await readJson<{ name?: string; category?: string; finishes?: string[]; createdAt?: string }>(path.join(dir, "product.json"));
    const t = templates.get(views.template);
    let renderedFrames = 0;
    try { renderedFrames = (await readdir(path.join(dir, "cad-spin"))).filter((f) => /^\d{3}\.png$/.test(f)).length; } catch {}
    out.push({
      slug: d.name, name: product?.name ?? views.product ?? d.name, template: views.template,
      category: product?.category ?? t?.label ?? views.template, finishes: product?.finishes ?? t?.finishes ?? [],
      mount: t?.mount ?? "floor", views: views.views.map((v) => v.name),
      status: await readJson<Status>(path.join(dir, "status.json")), renderedFrames,
      secondsPerFrame: t?.secondsPerFrame ?? 30, createdAt: product?.createdAt,
    });
  }
  return out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** A folder name from the product name: lowercase words joined by hyphens, unique in the products folder. */
export function slugFor(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "product";
  let slug = base;
  for (let n = 2; existsSync(path.join(PRODUCTS, slug)); n++) slug = `${base}-${n}`;
  return slug;
}

/** Writes files into a product folder (subfolders created); objects are written as JSON. */
export async function writeProductFiles(slug: string, files: Record<string, unknown>) {
  const dir = path.join(PRODUCTS, slug);
  for (const [name, data] of Object.entries(files)) {
    const file = path.join(dir, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof data === "string" || data instanceof Uint8Array ? data : JSON.stringify(data, null, 2));
  }
}

/** Starts a pipeline stage in the background (detached), logging to pipeline.log in the product folder. */
export function startPipeline(slug: string, stage: "process" | "render") {
  // Dev-only paths from the environment: tell the bundler not to trace them (it would pull the whole project
  // into the server output).
  if (!BLENDER || !existsSync(/*turbopackIgnore: true*/ BLENDER)) throw new Error("Set BLENDER in web/.env.local to blender.exe (Blender 4.5 LTS with build123d)");
  const dir = path.join(PRODUCTS, slug);
  const log = openSync(path.join(dir, "pipeline.log"), "a");
  const child = spawn(process.execPath, [path.join(CAD, "pipeline.mjs"), dir, "--stage", stage], {
    cwd: path.join(CAD, "..", ".."), detached: true, windowsHide: true, stdio: ["ignore", log, log], env: { ...process.env, BLENDER },
  });
  child.unref();
}

export const notInProduction = () => (process.env.NODE_ENV === "production" ? new Response(null, { status: 404 }) : null);
