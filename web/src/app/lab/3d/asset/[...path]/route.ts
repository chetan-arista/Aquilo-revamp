import path from "node:path";
import { serveLabAsset } from "@/lib/labAsset";

// The 3D pipeline's test products (ABO dataset, CC BY 4.0, git-ignored test-assets/abo/products), dev only.
const ROOT = path.join(process.cwd(), "..", "test-assets", "abo", "products");

export async function GET(_req: Request, ctx: RouteContext<"/lab/3d/asset/[...path]">) {
  return serveLabAsset(ROOT, (await ctx.params).path);
}
