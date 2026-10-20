import path from "node:path";
import { serveLabAsset } from "@/lib/labAsset";

// The CAD route's test products (third-party marketplace photos, git-ignored test-assets/faucets/products),
// dev only and never published.
const ROOT = path.join(process.cwd(), "..", "test-assets", "faucets", "products");

export async function GET(_req: Request, ctx: RouteContext<"/lab/cad/asset/[...path]">) {
  return serveLabAsset(ROOT, (await ctx.params).path);
}
