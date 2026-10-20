import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves the third-party test panoramas from the git-ignored test-assets/360 folder, in development only.
// They never go into public/ and this route answers 404 in a production build.
const DIR = path.join(process.cwd(), "..", "test-assets", "360");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".json": "application/json" };

export async function GET(_req: Request, ctx: RouteContext<"/lab/360/pano/[file]">) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const name = path.basename((await ctx.params).file);
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.join(DIR, name));
    return new Response(new Uint8Array(body), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
