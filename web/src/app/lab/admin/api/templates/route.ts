import { listTemplates, notInProduction } from "@/lib/labProducts";

// Dev only: the product types the CAD pipeline has templates for.
export async function GET() {
  return notInProduction() ?? Response.json(await listTemplates());
}
