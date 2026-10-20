import path from "node:path";
import { listProducts, listTemplates, notInProduction, slugFor, startPipeline, writeProductFiles } from "@/lib/labProducts";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 20 * 1024 * 1024;

// Dev only: every product with its pipeline status.
export async function GET() {
  return notInProduction() ?? Response.json(await listProducts());
}

/**
 * Dev only: add a product. Form fields: name, template, size (mm), finishes (repeated), photo:<view name> files.
 * Saves the photos and the product files, then starts the pipeline's "process" stage in the background.
 */
export async function POST(request: Request) {
  const blocked = notInProduction();
  if (blocked) return blocked;
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const template = (await listTemplates()).find((t) => t.key === form.get("template"));
  const size = Number(form.get("size"));
  if (!name || name.length > 120) return Response.json({ error: "Give the product a name." }, { status: 400 });
  if (!template) return Response.json({ error: "Pick a product type." }, { status: 400 });
  if (!(size > 10 && size < 5000)) return Response.json({ error: `Enter the ${template.size.label.toLowerCase()}.` }, { status: 400 });
  const finishes = form.getAll("finishes").map(String).filter((f) => template.finishes.includes(f));
  if (!finishes.length) return Response.json({ error: "Pick at least one finish." }, { status: 400 });

  const photos: { view: (typeof template.views)[number]; file: File; ext: string }[] = [];
  for (const view of template.views) {
    const file = form.get(`photo:${view.name}`);
    if (!(file instanceof File) || file.size === 0) {
      if (view.required) return Response.json({ error: `Add the photo "${view.label}".` }, { status: 400 });
      continue;
    }
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return Response.json({ error: `"${file.name}" is not a JPEG, PNG or WebP photo.` }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: `"${file.name}" is over 20 MB.` }, { status: 400 });
    photos.push({ view, file, ext });
  }

  const slug = slugFor(name);
  const files: Record<string, unknown> = {};
  for (const p of photos) files[path.join("source", `${p.view.name}.${p.ext}`)] = new Uint8Array(await p.file.arrayBuffer());
  await writeProductFiles(slug, {
    ...files,
    "views.json": {
      template: template.key, product: name, source: "source",
      [template.size.key]: size, sizeNote: `${size} mm, entered by the store admin`,
      finish: finishes[0], render: template.render,
      views: photos.map((p) => ({ name: p.view.name, file: `${p.view.name}.${p.ext}`, note: p.view.label, ...(p.view.flip ? { flip: true } : {}), ...(p.view.pitch ? { pitch: p.view.pitch } : {}) })),
    },
    "product.json": { name, category: template.label, finishes, createdAt: new Date().toISOString() },
  });
  try {
    startPipeline(slug, "process");
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
  return Response.json({ slug }, { status: 201 });
}
