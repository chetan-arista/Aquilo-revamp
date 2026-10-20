import { readFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".json": "application/json",
  ".glb": "model/gltf-binary", ".mp4": "video/mp4", ".webm": "video/webm", ".step": "model/step",
};

/**
 * Serves a file from a git-ignored test-assets folder for the dev-only labs. Test data is third party and
 * never published, so this answers 404 in a production build, for unknown types and for paths that escape root.
 */
export async function serveLabAsset(root: string, parts: string[]) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const file = path.join(root, ...parts.map((p) => path.basename(p)));
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !file.startsWith(root)) return new Response(null, { status: 404 });
  try {
    const body = await readFile(file);
    const headers: Record<string, string> = { "Content-Type": type, "Cache-Control": "private, max-age=600" };
    if (type === "model/step") headers["Content-Disposition"] = `attachment; filename="${path.basename(file)}"`;
    return new Response(new Uint8Array(body), { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
