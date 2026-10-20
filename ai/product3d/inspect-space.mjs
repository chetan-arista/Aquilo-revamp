// Prints a Hugging Face Space's API (endpoints and parameters). Usage: node product3d/inspect-space.mjs <owner/space>
import { Client } from "@gradio/client";
const space = process.argv[2] ?? "tencent/Hunyuan3D-2mv";
const client = await Client.connect(space, process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {});
const api = await client.view_api();
for (const [name, ep] of Object.entries(api.named_endpoints)) {
  console.log("\n" + name);
  for (const p of ep.parameters) console.log("   in ", p.parameter_name ?? p.label, "|", p.python_type?.type ?? p.type?.type ?? "", p.parameter_has_default ? `(default ${JSON.stringify(p.parameter_default).slice(0, 40)})` : "");
  for (const r of ep.returns) console.log("   out", r.label, "|", r.python_type?.type ?? "");
}
