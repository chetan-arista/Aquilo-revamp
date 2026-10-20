import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { notInProduction, PRODUCTS, startPipeline, type Status } from "@/lib/labProducts";

/**
 * Dev only: the admin's decision on a processed product. Body: { action: "approve" | "reject" | "retry" }.
 * approve → render the 360 and publish; reject → mark it for new photos; retry → run the processing again.
 */
export async function POST(request: Request, ctx: RouteContext<"/lab/admin/api/products/[slug]">) {
  const blocked = notInProduction();
  if (blocked) return blocked;
  const slug = path.basename((await ctx.params).slug);
  const dir = path.join(PRODUCTS, slug);
  if (!existsSync(path.join(dir, "views.json"))) return Response.json({ error: "No such product." }, { status: 404 });
  const { action } = (await request.json()) as { action?: string };
  const statusFile = path.join(dir, "status.json");
  const status = existsSync(statusFile) ? (JSON.parse(await readFile(statusFile, "utf8")) as Status) : null;
  try {
    if (action === "approve" && status?.state === "review") startPipeline(slug, "render");
    else if (action === "reject" && status?.state === "review") await writeFile(statusFile, JSON.stringify({ ...status, state: "rejected", updatedAt: new Date().toISOString() }, null, 2));
    else if (action === "retry" && status && ["failed", "rejected"].includes(status.state)) {
      const stage = status.steps.some((s) => s.key === "render" && s.state !== "pending") ? "render" : "process";
      startPipeline(slug, stage);
    } else return Response.json({ error: `Cannot ${action} a product that is ${status?.state ?? "new"}.` }, { status: 409 });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
