import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_BOUNDS, LOGO_LETTERS } from "@/data/logo-paths";

// The AQUILO wordmark standing under the shower, in world units.
export const LOGO_W = 5.4;
export const LOGO_S = LOGO_W / LOGO_BOUNDS.width;
export const LOGO_DEPTH = 0.5;
export const LOGO_BASE = -0.28; // world y of the letters' baseline
const BASE_PX = 187; // baseline row in the vector artwork (the Q's tail dips below it)
const ROWS = 240;

export const wx = (px: number) => (px - LOGO_BOUNDS.width / 2) * LOGO_S;
export const wy = (py: number) => LOGO_BASE + (BASE_PX - py) * LOGO_S;
export const colOf = (x: number) => Math.round(x / LOGO_S + LOGO_BOUNDS.width / 2);

export type Cup = {
  /** Interior (where water can pool) and outer extents, world x. */
  x0: number; x1: number; outerL: number; outerR: number;
  /** World y of the lower arm top: the water level at which it overflows. */
  rim: number;
  /** Bottom centre of the U: it tips around this point. */
  pivot: THREE.Vector3;
  /** Interior floor height (world y) per column between x0 and x1. */
  floor: Float32Array;
  floorMin: number;
  /** Water volume held when filled to `level` (world y), and the inverse. */
  volumeAt: (level: number) => number;
  levelFor: (volume: number) => number;
  full: number;
  firstCol: number;
};

export type LogoField = {
  letters: { char: string; shapes: THREE.Shape[] }[];
  /** Per artwork column: world y of the first solid surface met from above (NaN where water passes). */
  top: Float32Array;
  /** Per artwork column: world y of the lowest solid point, where water running down a face drips off. */
  bottom: Float32Array;
  cup: Cup;
};

function raster(chars: string[]) {
  const W = LOGO_BOUNDS.width + 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = ROWS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  for (const l of LOGO_LETTERS) if (chars.includes(l.char)) ctx.fill(new Path2D(l.d), "evenodd");
  const { data } = ctx.getImageData(0, 0, W, ROWS);
  const top = new Int32Array(W).fill(-1), bottom = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < ROWS; y++)
      if (data[(y * W + x) * 4 + 3] > 127) { if (top[x] < 0) top[x] = y; bottom[x] = y; }
  return Object.assign(top, { bottom });
}

/** Turns the real vector wordmark into extrudable shapes plus the height map the water falls on. */
export function buildLogoField(): LogoField {
  const loader = new SVGLoader();
  const toWorld = (pts: THREE.Vector2[]) => pts.map((p) => new THREE.Vector2(wx(p.x), wy(p.y)));
  const letters = LOGO_LETTERS.map((l) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${l.d}" fill-rule="evenodd"/></svg>`;
    const shapes = loader.parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p)).map((s) => {
      const shape = new THREE.Shape(toWorld(s.getPoints(10)));
      shape.holes = s.holes.map((h) => new THREE.Path(toWorld(h.getPoints(10))));
      return shape;
    });
    return { char: l.char, shapes };
  });

  const rows = raster(LOGO_LETTERS.map((l) => l.char));
  const top = new Float32Array(rows.length).map((_, x) => (rows[x] < 0 ? NaN : wy(rows[x])));
  const bottom = new Float32Array(rows.length).map((_, x) => (rows.bottom[x] < 0 ? NaN : wy(rows.bottom[x])));

  // The U alone: its arms reach the top row, its interior floor sits lower.
  const u = raster(["U"]);
  const cols = [...u.keys()].filter((x) => u[x] >= 0);
  const outer0 = cols[0], outer1 = cols[cols.length - 1];
  // Interior = the longest run of columns whose top sits well below the arm tops (anti-aliased outer
  // edge columns also start low, so a plain filter would mistake them for the inside of the cup).
  let first = 0, last = -1;
  for (let i = 0, start = -1; i <= cols.length; i++) {
    const low = i < cols.length && u[cols[i]] > 14;
    if (low && start < 0) start = i;
    if (!low && start >= 0) {
      if (i - start > last - first + 1) { first = cols[start]; last = cols[i - 1]; }
      start = -1;
    }
  }
  const armTop = Math.max(Math.min(...cols.filter((x) => x < first).map((x) => u[x])), Math.min(...cols.filter((x) => x > last).map((x) => u[x])));
  const floor = new Float32Array(last - first + 1).map((_, i) => wy(u[first + i]));
  const rim = wy(armTop);
  const floorMin = Math.min(...floor);
  const inner = LOGO_DEPTH * 0.94;
  const volumeAt = (level: number) => floor.reduce((v, f) => v + Math.max(0, level - f), 0) * LOGO_S * inner;
  const full = volumeAt(rim);
  const levelFor = (volume: number) => {
    let lo = floorMin, hi = rim;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (volumeAt(mid) < volume) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const cup: Cup = {
    x0: wx(first), x1: wx(last), outerL: wx(outer0), outerR: wx(outer1), rim,
    pivot: new THREE.Vector3(wx((outer0 + outer1) / 2), wy(BASE_PX + 1), 0),
    floor, floorMin, volumeAt, levelFor, full, firstCol: first,
  };
  return { letters, top, bottom, cup };
}
