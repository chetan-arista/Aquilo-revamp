// Silhouette helpers for the CAD route: photo masks on a coarse grid, an orthographic projection of a point
// cloud fitted to a photo's bounding box, and IoU between the two.
import sharp from "sharp";
import path from "node:path";

export const G = 200;

export async function readMask(dir, name) {
  const { data, info } = await sharp(path.join(dir, `${name}-mask.png`)).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, grid = new Uint8Array(G * G);
  let y0 = H, y1 = 0, x0 = W, x1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * C] > 127) {
    grid[Math.floor((y * G) / H) * G + Math.floor((x * G) / W)] = 1;
    y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x);
  }
  const s = G / W;
  return { grid, box: { x0: x0 * s, x1: x1 * s, y0: y0 * s, y1: y1 * s } };
}

/** Orthographic view: turn the tap by yaw about its axis, tilt the camera down by pitch, fit to the photo's box. */
export function project(X, yawDeg, pitchDeg, mirror, box) {
  const a = (yawDeg * Math.PI) / 180, b = (pitchDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const n = X.length / 3, u = new Float32Array(n), v = new Float32Array(n);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = X[i * 3], y = X[i * 3 + 1], z = X[i * 3 + 2];
    const xr = x * ca + z * sa, zr = -x * sa + z * ca;
    u[i] = mirror ? -xr : xr; v[i] = y * cb - zr * sb;
    u0 = Math.min(u0, u[i]); u1 = Math.max(u1, u[i]); v0 = Math.min(v0, v[i]); v1 = Math.max(v1, v[i]);
  }
  const k = (box.y1 - box.y0) / (v1 - v0), grid = new Uint8Array(G * G);
  const ou = (box.x0 + box.x1) / 2 - ((u0 + u1) / 2) * k;
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(ou + u[i] * k), gy = Math.floor(box.y0 + (v1 - v[i]) * k);
    if (gx >= 0 && gy >= 0 && gx < G && gy < G) grid[gy * G + gx] = 1;
  }
  // Points leave pinholes: close them with one pass of 3x3 majority.
  const out = new Uint8Array(grid);
  for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) if (!grid[y * G + x]) {
    let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += grid[(y + dy) * G + x + dx];
    if (c >= 5) out[y * G + x] = 1;
  }
  return out;
}

export const iou = (a, b) => { let i = 0, u = 0; for (let j = 0; j < a.length; j++) { i += a[j] & b[j]; u += a[j] | b[j]; } return i / Math.max(u, 1); };
