// Template rain-shower: a round overhead shower head on a wall arm, fitted by outline. Units: mm; the head
// diameter is fixed by the listing ("8 inch" = 200 mm, views.json "headDiameterMm").
//   wall flange   disc on the wall, the arm leaves it horizontally
//   arm           round tube: straight out from the wall, a bend of radius bendR, straight down to the head
//   hub           connector cylinder above the head
//   head          thin disc, thicker at the centre than at the edge; nozzles on its face (not in the outline)
// The turntable axis is the head's axis (y); the wall is at x = -reach.
export const HEAD_D = 200; // fitting size; build.py scales to views.json "headDiameterMm"

export const params = {
  reach: { init: 300, min: 150, max: 520, step: 30 },
  drop: { init: 120, min: 40, max: 300, step: 20 },
  bendR: { init: 45, min: 12, max: 100, step: 8 },
  tubeD: { init: 22, min: 12, max: 34, step: 3 },
  flangeD: { init: 55, min: 30, max: 95, step: 6 },
  flangeT: { init: 18, min: 6, max: 40, step: 4 },
  hubD: { init: 32, min: 20, max: 55, step: 4 },
  hubH: { init: 22, min: 6, max: 50, step: 4 },
  headT: { init: 10, min: 4, max: 24, step: 2 },
};

/** Derived positions shared with build.py. */
export function layout(p) {
  const bendR = Math.min(p.bendR, p.drop - 2);
  const hubTop = p.headT + p.hubH;
  const armY = hubTop + p.drop;
  return { bendR, hubTop, armY, wallX: -p.reach };
}

export function points(p) {
  const { bendR, hubTop, armY, wallX } = layout(p), r = p.tubeD / 2, out = [];
  const circleX = (x, y, rad, n = 20) => { for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI; out.push(x, y + rad * Math.cos(a), rad * Math.sin(a)); } };
  const circleY = (y, rad, n) => { for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI; out.push(rad * Math.cos(a), y, rad * Math.sin(a)); } };
  // Head: filled top and bottom, edge rows.
  for (let rad = 0; rad <= HEAD_D / 2; rad += 3) { circleY(0, rad, Math.max(8, Math.round(rad))); circleY(p.headT * (rad < p.hubD ? 1 : 0.7), rad, Math.max(8, Math.round(rad))); }
  for (let y = 0; y <= p.headT * 0.7; y += 1) circleY(y, HEAD_D / 2, 160);
  // Hub.
  for (let y = p.headT; y <= hubTop; y += 1.5) circleY(y, p.hubD / 2, 40);
  // Drop, bend, arm.
  for (let y = hubTop; y <= armY - bendR; y += 2) circleY(y, r, 20);
  for (let a = 0; a <= 90; a += 3) {
    const t = (a * Math.PI) / 180, cx = -bendR + bendR * Math.cos(t), cy = armY - bendR + bendR * Math.sin(t);
    const tx = -Math.sin(t), ty = Math.cos(t); // tube direction; rings are perpendicular to it
    for (let k = 0; k < 20; k++) { const b = (k / 20) * 2 * Math.PI; out.push(cx + r * Math.cos(b) * ty, cy - r * Math.cos(b) * tx, r * Math.sin(b)); }
  }
  for (let x = -bendR; x >= wallX; x -= 2) circleX(x, armY, r);
  // Flange on the wall.
  for (let x = wallX; x <= wallX + p.flangeT; x += 1.5) circleX(x, armY, p.flangeD / 2, 48);
  for (let rad = 0; rad <= p.flangeD / 2; rad += 3) circleX(wallX, armY, rad, Math.max(8, Math.round(rad)));
  return new Float32Array(out);
}

export const summary = (p, cams) => {
  const cam = Object.values(cams)[0];
  return `Arm reaches ${p.reach.toFixed(0)} mm from the wall and drops ${p.drop.toFixed(0)} mm, tube ${p.tubeD.toFixed(0)} mm. Camera found ${cam.yaw.toFixed(0)}° round, ${Math.abs(cam.pitch).toFixed(0)}° ${cam.pitch < 0 ? "below" : "above"}.`;
};
