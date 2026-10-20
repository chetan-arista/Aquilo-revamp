import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Dev only: tours authored in /lab/360/editor, saved as JSON next to the third-party test panoramas
// (git-ignored test-assets/360/tours). Real tours are exported to web/src/data/showrooms/<centre>.json.
const DIR = path.join(process.cwd(), "..", "test-assets", "360", "tours");
const safe = (id: string) => path.basename(id).replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "demo";

export async function GET(_req: Request, ctx: RouteContext<"/lab/360/tours/[id]">) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  try {
    return new Response(await readFile(path.join(DIR, `${safe((await ctx.params).id)}.json`), "utf8"), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function POST(request: Request, ctx: RouteContext<"/lab/360/tours/[id]">) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const tour = await request.json().catch(() => null);
  if (!tour || !Array.isArray(tour.spots)) return Response.json({ error: "Not a tour." }, { status: 400 });
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${safe((await ctx.params).id)}.json`), JSON.stringify(tour, null, 2));
  return Response.json({ ok: true });
}
