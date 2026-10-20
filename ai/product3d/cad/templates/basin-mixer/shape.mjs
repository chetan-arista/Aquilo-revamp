// The basin mixer template as a point cloud, for fitting. build_faucet.py builds the same shape as a CAD solid:
//   body   surface of revolution, radius r(y) from profile.json
//   spout  rounded rectangle slices (superellipse, exponent 4) at each x; height from the photo, width linear
//          from spoutW0 at the body to spoutW1 at the tip (mm)
//   lever  same slices; width linear from leverW0 at the back to leverW1 at the tip
export const SUPER = 4;

function* section(cy, h, w, steps) {
  for (let k = 0; k < steps; k++) {
    const t = (k / steps) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
    yield [cy + (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / SUPER), (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / SUPER)];
  }
}

/** Width of a part at slice x, linear from w0 at x0 to w1 at x1. */
const lerpW = (x, x0, x1, w0, w1) => w0 + (w1 - w0) * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));

export function points(profile, p, step = 2) {
  const out = [];
  for (const [y, r] of profile.body) if (r > 0) for (let k = 0; k < 48; k++) { const a = (k / 48) * 2 * Math.PI; out.push(r * Math.cos(a), y, r * Math.sin(a)); }
  const part = (slices, w0, w1) => {
    if (!slices.length) return;
    const xs = slices.map((s) => s[0]), x0 = Math.max(...xs), x1 = Math.min(...xs);
    slices.forEach(([x, top, bot], i) => {
      if (i % step) return;
      const w = lerpW(x, x0, x1, w0, w1);
      for (const [y, z] of section((top + bot) / 2, top - bot, w, 32)) out.push(x, y, z);
    });
  };
  part(profile.spout, p.spoutW0, p.spoutW1);
  part(profile.lever, p.leverW0, p.leverW1);
  return new Float32Array(out);
}
