// Template vessel-basin: a round countertop basin (bowl), fitted by outline. Units: mm with the rim radius fixed
// at 200 while fitting; build.py scales the whole basin to the known width (views.json "widthMm").
//   outer wall  smooth curve through the base (rb at the floor), r1 at a third of the height, r2 at two thirds
//               and the rim (R at the top): bowls, eggs and cones all fit
//   inside      the outer wall offset by the wall thickness, a flat floor, a pop-up drain (not in the outline)
export const R = 200;

export const params = {
  H: { init: 150, min: 70, max: 300, step: 16 },
  rb: { init: 80, min: 30, max: 190, step: 16 },
  r1: { init: 150, min: 40, max: 280, step: 16 },
  r2: { init: 185, min: 60, max: 280, step: 16 },
};

/** The outer wall as [r, y] from the base to the rim: a monotone cubic (Fritsch and Carlson) through the four
 *  control radii. Unlike a natural spline it never swings past its control points, so a basin cannot grow a
 *  waist or a bulge the photo does not show (a nibbled outline used to pull one in). */
export function profile(p, n = 40) {
  const ys = [0, p.H / 3, (2 * p.H) / 3, p.H], rs = [p.rb, p.r1, p.r2, R], h = p.H / 3;
  const d = [0, 1, 2].map((i) => (rs[i + 1] - rs[i]) / h);
  const m = [d[0], 0, 0, d[2]];
  for (let i = 1; i < 3; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  const out = [];
  for (let k = 0; k <= n; k++) {
    const y = (p.H * k) / n, i = Math.min(2, Math.floor(y / h)), t = (y - ys[i]) / h;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
    out.push([Math.max(5, h00 * rs[i] + h10 * h * m[i] + h01 * rs[i + 1] + h11 * h * m[i + 1]), y]);
  }
  return out;
}

export function points(p) {
  const out = [], ring = (r, y, n) => { for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI; out.push(r * Math.cos(a), y, r * Math.sin(a)); } };
  // Dense enough that neighbouring points are under one outline grid cell apart, even when the basin fills the photo.
  for (const [r, y] of profile(p, Math.round(p.H / 1.5))) ring(r, y, Math.round(r * 1.6));
  // The opening and the floor: from outside the bowl is a solid outline, so fill both discs.
  for (let r = 0; r < R; r += 2) ring(r, p.H, Math.max(8, Math.round(r * 1.6)));
  for (let r = 0; r < p.rb; r += 2) ring(r, 0, Math.max(8, Math.round(r * 1.6)));
  return new Float32Array(out);
}

export const extra = (p) => ({ profile: profile(p, 40).map(([r, y]) => [+r.toFixed(2), +y.toFixed(2)]), rimRadius: R });

export const summary = (p, cams) => {
  const cam = Object.values(cams)[0];
  return `Bowl ${(p.H / (2 * R)).toFixed(2)} times as deep as it is wide, base ${((p.rb / R) * 100).toFixed(0)}% of the rim. Camera found ${cam.pitch.toFixed(0)}° above.`;
};
