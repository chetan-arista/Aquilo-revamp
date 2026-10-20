// mesh.glb (untextured, from make3d.mjs) + the four photos → model.glb, coloured from the real photos.
// Usage (from ai/): node product3d/paint.mjs <product dir> [--faces 60000]
//
// 1. Weld and simplify the generated mesh (meshoptimizer), recompute normals.
// 2. Find how the mesh is turned relative to the photos: try the 8 yaw / mirror combinations and keep the
//    one whose silhouettes overlap the photos' best (IoU).
// 3. For every vertex, project into each photo (orthographic, scaled to the photo's foreground box), test
//    visibility with a small z-buffer, weight by how squarely the surface faces that camera, and blend the
//    sampled colours. Vertices no photo sees (tops, bottoms) take their neighbours' colour.
// 4. Centre on the floor, scale to 1 unit tall, write COLOR_0 and a neutral material.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, simplify, prune, dedup } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import path from "node:path";
import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const faces = Number((args[args.indexOf("--faces") + 1] && args.includes("--faces")) ? args[args.indexOf("--faces") + 1] : 60000);
const VIEWS = [["front", 0], ["right", 90], ["back", 180], ["left", 270]]; // degrees the camera has gone round

// ——— Mesh in, simplified ———
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.join(dir, "mesh.glb"));
await doc.transform(weld(), dedup());
const prim0 = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const tris0 = prim0.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
// (gltf-transform's normals() unwelds into flat faces, so smooth normals are computed here instead.)
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, faces / tris0), error: 0.002 }), prune());
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
for (const sem of prim.listSemantics()) if (sem !== "POSITION") prim.setAttribute(sem, null);
const P = prim.getAttribute("POSITION").getArray(), I = prim.getIndices().getArray();
const n = P.length / 3;
// Area weighted smooth vertex normals.
const N = new Float32Array(n * 3);
for (let t = 0; t < I.length; t += 3) {
  const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
  const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
  const e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
  const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  for (const v of [a, b, c]) for (let q = 0; q < 3; q++) N[v * 3 + q] += f[q];
}
for (let i = 0; i < n; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; for (let q = 0; q < 3; q++) N[i * 3 + q] /= l; }

// Bounds
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], P[i * 3 + a]); max[a] = Math.max(max[a], P[i * 3 + a]); }
const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;

// ——— Photos: RGB + foreground box (anything clearly not white) ———
async function photo(name) {
  const { data, info } = await sharp(path.join(dir, `${name}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, fg = new Uint8Array(W * H);
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (Math.min(data[i], data[i + 1], data[i + 2]) < 238) { fg[y * W + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  // Colour is only sampled well inside the silhouette: edge pixels blend product and background.
  const core = new Uint8Array(W * H), R = Math.max(2, Math.round(Math.max(W, H) / 300));
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) {
    if (!fg[y * W + x]) continue;
    let inside = 1;
    for (let d = -R; d <= R && inside; d += R) for (let e = -R; e <= R; e += R) if (!fg[(y + d) * W + x + e]) { inside = 0; break; }
    core[y * W + x] = inside;
  }
  return { data, W, H, fg, core, box: { x0, x1, y0, y1 } };
}
const photos = await Promise.all(VIEWS.map(([v]) => photo(v)));

// Orthographic projection for a view: rotate the object by -(view angle + offset) around Y, then fit
// the mesh's height to the photo's foreground height and align the boxes' centres.
function projector(viewDeg, offsetDeg, mirror, ph) {
  const a = ((viewDeg + offsetDeg) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const rot = (x, z) => [x * c - z * s, x * s + z * c];
  // projected x extents for this view
  let ux0 = Infinity, ux1 = -Infinity;
  for (let i = 0; i < n; i++) { const [rx] = rot(P[i * 3] - cx, P[i * 3 + 2] - cz); const ux = mirror ? -rx : rx; ux0 = Math.min(ux0, ux); ux1 = Math.max(ux1, ux); }
  const { x0, x1, y0, y1 } = ph.box;
  const k = (y1 - y0) / (max[1] - min[1]);
  const offX = (x0 + x1) / 2 - ((ux0 + ux1) / 2) * k;
  return (i) => {
    const [rx, rz] = rot(P[i * 3] - cx, P[i * 3 + 2] - cz);
    const ux = mirror ? -rx : rx;
    return { x: offX + ux * k, y: y0 + (max[1] - P[i * 3 + 1]) * k, depth: -rz, dir: [mirror ? -1 : 1, rot] };
  };
}

// ——— 1. Orientation by silhouette overlap ———
function iou(proj, ph) {
  const G = 96, sx = G / ph.W, sy = G / ph.H, sil = new Uint8Array(G * G), ref = new Uint8Array(G * G);
  for (let i = 0; i < n; i++) { const p = proj(i); const gx = Math.floor(p.x * sx), gy = Math.floor(p.y * sy); if (gx >= 0 && gy >= 0 && gx < G && gy < G) sil[gy * G + gx] = 1; }
  for (let y = 0; y < ph.H; y++) for (let x = 0; x < ph.W; x++) if (ph.fg[y * ph.W + x]) ref[Math.floor(y * sy) * G + Math.floor(x * sx)] = 1;
  let inter = 0, uni = 0;
  for (let j = 0; j < G * G; j++) { inter += sil[j] & ref[j]; uni += sil[j] | ref[j]; }
  return inter / Math.max(uni, 1);
}
let best = { score: -1, offset: 0, mirror: false };
for (const mirror of [false, true]) for (const offset of [0, 90, 180, 270]) {
  const score = VIEWS.reduce((s, [, deg], k) => s + iou(projector(deg, offset, mirror, photos[k]), photos[k]), 0) / 4;
  if (score > best.score) best = { score, offset, mirror };
}

// ——— 2. Colour from the photos ———
const acc = new Float32Array(n * 3), wsum = new Float32Array(n);
VIEWS.forEach(([, deg], k) => {
  const ph = photos[k], proj = projector(deg, best.offset, best.mirror, ph);
  const Z = 768, zs = Z / Math.max(ph.W, ph.H), zbuf = new Float32Array(Z * Z).fill(Infinity);
  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = (pts[i] = proj(i));
    const gx = Math.floor(p.x * zs), gy = Math.floor(p.y * zs);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx, y = gy + dy;
      if (x >= 0 && y >= 0 && x < Z && y < Z) zbuf[y * Z + x] = Math.min(zbuf[y * Z + x], p.depth);
    }
  }
  const a = ((deg + best.offset) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const eps = (max[1] - min[1]) * 0.012;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    // Camera looks along -depth; facing = how squarely the normal points back at it.
    const nz = -(N[i * 3] * s + N[i * 3 + 2] * c);
    const facing = Math.max(0, -nz);
    if (facing < 0.08) continue;
    const gx = Math.floor(p.x * zs), gy = Math.floor(p.y * zs);
    if (gx < 0 || gy < 0 || gx >= Z || gy >= Z || p.depth > zbuf[gy * Z + gx] + eps) continue;
    const x = Math.round(p.x), y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= ph.W || y >= ph.H || !ph.core[y * ph.W + x]) continue;
    // Strongly prefer the view that sees the surface most squarely, so views barely blend at seams.
    const j = (y * ph.W + x) * 3, w = facing ** 6;
    acc[i * 3] += ph.data[j] * w; acc[i * 3 + 1] += ph.data[j + 1] * w; acc[i * 3 + 2] += ph.data[j + 2] * w;
    wsum[i] += w;
  }
});

// ——— 3. Fill vertices no photo saw, from their neighbours ———
const col = new Float32Array(n * 3), known = new Uint8Array(n);
for (let i = 0; i < n; i++) if (wsum[i] > 0) { known[i] = 1; for (let a = 0; a < 3; a++) col[i * 3 + a] = acc[i * 3 + a] / wsum[i] / 255; }
for (let pass = 0, left = n; pass < 200 && left > 0; pass++) {
  const sum = new Float32Array(n * 3), cnt = new Uint16Array(n);
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = I[t + e], b = I[t + ((e + 1) % 3)];
    if (known[b] && !known[a]) { for (let q = 0; q < 3; q++) sum[a * 3 + q] += col[b * 3 + q]; cnt[a]++; }
    if (known[a] && !known[b]) { for (let q = 0; q < 3; q++) sum[b * 3 + q] += col[a * 3 + q]; cnt[b]++; }
  }
  left = 0;
  for (let i = 0; i < n; i++) if (!known[i]) { if (cnt[i]) { for (let q = 0; q < 3; q++) col[i * 3 + q] = sum[i * 3 + q] / cnt[i]; known[i] = 2; } else left++; }
  for (let i = 0; i < n; i++) if (known[i] === 2) known[i] = 1;
}
// glTF vertex colours are linear; the photos are sRGB.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
for (let i = 0; i < col.length; i++) col[i] = lin(col[i]);

// ——— 4. Normalise: rotate to face +Z like the front photo, stand on the floor, 1 unit tall ———
const a0 = (best.offset * Math.PI) / 180, c0 = Math.cos(a0), s0 = Math.sin(a0), h = max[1] - min[1];
const pos = new Float32Array(P.length), nor = new Float32Array(N.length);
for (let i = 0; i < n; i++) {
  let x = P[i * 3] - cx, z = P[i * 3 + 2] - cz;
  let rx = x * c0 - z * s0, rz = x * s0 + z * c0;
  if (best.mirror) rx = -rx;
  pos.set([rx / h, (P[i * 3 + 1] - min[1]) / h, rz / h], i * 3);
  let nx = N[i * 3] * c0 - N[i * 3 + 2] * s0, nz = N[i * 3] * s0 + N[i * 3 + 2] * c0;
  if (best.mirror) nx = -nx;
  nor.set([nx, N[i * 3 + 1], nz], i * 3);
}
if (best.mirror) for (let t = 0; t < I.length; t += 3) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; }
prim.getAttribute("POSITION").setArray(pos);
prim.setAttribute("NORMAL", doc.createAccessor("normal").setType("VEC3").setArray(nor).setBuffer(doc.getRoot().listBuffers()[0]));
prim.getIndices().setArray(I);
prim.setAttribute("COLOR_0", doc.createAccessor("color").setType("VEC3").setArray(col).setBuffer(doc.getRoot().listBuffers()[0]));
const mat = doc.createMaterial("photo").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.45).setMetallicFactor(0);
prim.setMaterial(mat);
await doc.transform(prune());
const out = path.join(dir, "model.glb");
await io.write(out, doc);
const seen = wsum.reduce((s, w) => s + (w > 0 ? 1 : 0), 0);
const report = { triangles: I.length / 3, vertices: n, orientation: best, seenByPhotos: +(seen / n).toFixed(3) };
await writeFile(path.join(dir, "model.json"), JSON.stringify(report, null, 1));
console.log(path.basename(dir), JSON.stringify(report));
