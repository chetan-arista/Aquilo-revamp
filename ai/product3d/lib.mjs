// Shared helpers for the product 3D experiments: read a GLB's surface in world space, read the four
// photos, score a mesh's silhouettes against them, and measure the distance between two shapes.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";
import path from "node:path";

export const VIEWS = [["front", 0], ["right", 90], ["back", 180], ["left", 270]]; // degrees the camera has gone round

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/** Every triangle of every mesh in a GLB, in world space: { P: Float32Array (xyz), I: Uint32Array }. */
export async function readSurface(file) {
  const doc = await io.read(file);
  const pos = [], idx = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute("POSITION");
      if (!a) continue;
      const base = pos.length / 3, v = [0, 0, 0];
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, v);
        pos.push(m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]);
      }
      const ind = prim.getIndices();
      if (ind) for (let i = 0; i < ind.getCount(); i++) idx.push(base + ind.getScalar(i));
      else for (let i = 0; i < a.getCount(); i++) idx.push(base + i);
    }
  }
  return { P: new Float32Array(pos), I: new Uint32Array(idx) };
}

/** Points spread evenly over the surface (area weighted), normalised to 1 unit tall and centred on the floor. */
export function samplePoints({ P, I }, count = 6000, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const tris = I.length / 3, area = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    const [a, b, c] = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
    const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
    const e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    total += area[t] = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2;
  }
  const cdf = new Float64Array(tris);
  for (let t = 0, acc = 0; t < tris; t++) cdf[t] = acc += area[t] / total;
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const r = rand();
    let lo = 0, hi = tris - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const [a, b, c] = [I[lo * 3], I[lo * 3 + 1], I[lo * 3 + 2]];
    for (let q = 0; q < 3; q++) out[k * 3 + q] = P[a * 3 + q] + u * (P[b * 3 + q] - P[a * 3 + q]) + v * (P[c * 3 + q] - P[a * 3 + q]);
  }
  return normalise(out);
}

function normalise(X) {
  const n = X.length / 3, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], X[i * 3 + a]); max[a] = Math.max(max[a], X[i * 3 + a]); }
  const h = max[1] - min[1] || 1, cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;
  const Y = new Float32Array(X.length);
  for (let i = 0; i < n; i++) Y.set([(X[i * 3] - cx) / h, (X[i * 3 + 1] - min[1]) / h, (X[i * 3 + 2] - cz) / h], i * 3);
  return Y;
}

/** Symmetric chamfer distance between two point sets (mean nearest distance both ways), in model heights. */
function chamfer(A, B) {
  const grid = new Map(), cell = 0.05, key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const nb = B.length / 3;
  for (let j = 0; j < nb; j++) { const k = key(B[j * 3], B[j * 3 + 1], B[j * 3 + 2]); (grid.get(k) ?? grid.set(k, []).get(k)).push(j); }
  const near = (x, y, z) => {
    let best = Infinity;
    for (let r = 1; r <= 4 && best === Infinity; r++) {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell), gz = Math.floor(z / cell);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        for (const j of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) best = Math.min(best, Math.hypot(B[j * 3] - x, B[j * 3 + 1] - y, B[j * 3 + 2] - z));
      }
    }
    return best === Infinity ? 0.25 : best;
  };
  let s = 0;
  for (let i = 0; i < A.length / 3; i++) s += near(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]);
  return s / (A.length / 3);
}

/** Shape distance after trying the 8 yaw / mirror alignments (the meshes come out in different frames). */
export function shapeDistance(A, B) {
  let best = Infinity;
  for (const mirror of [1, -1]) for (const deg of [0, 90, 180, 270]) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), R = new Float32Array(A.length);
    for (let i = 0; i < A.length / 3; i++) { const x = A[i * 3], z = A[i * 3 + 2]; R.set([mirror * (x * c - z * s), A[i * 3 + 1], x * s + z * c], i * 3); }
    best = Math.min(best, (chamfer(R, B) + chamfer(B, R)) / 2);
  }
  return best;
}

/** The four photos: RGB, a foreground mask (anything clearly not white) and its bounding box. */
export async function readPhotos(dir) {
  return Promise.all(VIEWS.map(async ([name]) => {
    const { data, info } = await sharp(path.join(dir, `${name}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, fg = new Uint8Array(W * H);
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < 238) { fg[y * W + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    return { data, W, H, fg, box: { x0, x1, y0, y1 } };
  }));
}

/** Mean silhouette IoU of a point set (normalised) against the four photos, best of 8 yaw / mirror alignments. */
export function silhouetteScore(X, photos) {
  const n = X.length / 3, G = 96;
  let best = { score: -1, offset: 0, mirror: false };
  for (const mirror of [false, true]) for (const offset of [0, 90, 180, 270]) {
    let sum = 0;
    VIEWS.forEach(([, deg], k) => {
      const ph = photos[k], a = ((deg + offset) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      const ux = new Float32Array(n);
      let u0 = Infinity, u1 = -Infinity;
      for (let i = 0; i < n; i++) { const rx = X[i * 3] * c - X[i * 3 + 2] * s; ux[i] = mirror ? -rx : rx; u0 = Math.min(u0, ux[i]); u1 = Math.max(u1, ux[i]); }
      const { x0, x1, y0, y1 } = ph.box, kk = y1 - y0, offX = (x0 + x1) / 2 - ((u0 + u1) / 2) * kk;
      const sx = G / ph.W, sy = G / ph.H, sil = new Uint8Array(G * G), ref = new Uint8Array(G * G);
      for (let i = 0; i < n; i++) {
        const gx = Math.floor((offX + ux[i] * kk) * sx), gy = Math.floor((y0 + (1 - X[i * 3 + 1]) * kk) * sy);
        if (gx >= 0 && gy >= 0 && gx < G && gy < G) sil[gy * G + gx] = 1;
      }
      for (let y = 0; y < ph.H; y++) for (let x = 0; x < ph.W; x++) if (ph.fg[y * ph.W + x]) ref[Math.floor(y * sy) * G + Math.floor(x * sx)] = 1;
      let inter = 0, uni = 0;
      for (let j = 0; j < G * G; j++) { inter += sil[j] & ref[j]; uni += sil[j] | ref[j]; }
      sum += inter / Math.max(uni, 1);
    });
    if (sum / 4 > best.score) best = { score: sum / 4, offset, mirror };
  }
  return best;
}
