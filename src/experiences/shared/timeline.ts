import * as THREE from "three";

/** A linear sequence of named beats. `at(t)` tells you which beat is playing and how far in. */
export function sequence<K extends string>(steps: readonly { key: K; dur: number }[]) {
  const starts: number[] = [];
  let total = 0;
  for (const s of steps) {
    starts.push(total);
    total += s.dur;
  }
  return {
    total,
    start(key: K) {
      return starts[steps.findIndex((s) => s.key === key)] ?? 0;
    },
    at(t: number) {
      let i = steps.length - 1;
      while (i > 0 && t < starts[i]) i--;
      const local = Math.max(0, t - starts[i]);
      return { key: steps[i].key, local, p: Math.min(1, local / steps[i].dur), index: i };
    },
  };
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export type Shot = { t: number; pos: [number, number, number]; look: [number, number, number] };

/**
 * Cinematic camera path through keyframed shots. Positions and look-targets follow
 * Catmull-Rom splines (smooth, no corners); time inside each segment is eased.
 */
export function cameraPath(shots: Shot[]) {
  const pos = new THREE.CatmullRomCurve3(
    shots.map((s) => new THREE.Vector3(...s.pos)),
    false,
    "centripetal",
  );
  const look = new THREE.CatmullRomCurve3(
    shots.map((s) => new THREE.Vector3(...s.look)),
    false,
    "centripetal",
  );
  const n = shots.length - 1;
  return {
    duration: shots[n].t,
    sample(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
      let i = 0;
      while (i < n - 1 && t > shots[i + 1].t) i++;
      const a = shots[i].t;
      const b = shots[i + 1].t;
      const u = easeInOut(Math.min(1, Math.max(0, (t - a) / (b - a))));
      const g = (i + u) / n;
      pos.getPoint(g, outPos);
      look.getPoint(g, outLook);
    },
  };
}

/** Distance at which a w×h rectangle exactly fills the camera view (times a margin). */
export function fitDistance(cam: THREE.PerspectiveCamera, w: number, h: number, margin = 1.04) {
  const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
  return Math.max(((h / 2) * margin) / Math.tan(vHalf), ((w / 2) * margin) / Math.tan(hHalf));
}

/** Point on a polyline path by distance travelled, plus its heading (radians, 0 = +Z). */
export function polylineAt(points: [number, number][], dist: number) {
  let left = dist;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (left <= len || i === points.length - 2) {
      const u = Math.min(1, left / len);
      return {
        x: x0 + (x1 - x0) * u,
        z: z0 + (z1 - z0) * u,
        heading: Math.atan2(x1 - x0, z1 - z0),
      };
    }
    left -= len;
  }
  const [x, z] = points[points.length - 1];
  return { x, z, heading: 0 };
}

export function polylineLength(points: [number, number][]) {
  let L = 0;
  for (let i = 0; i < points.length - 1; i++)
    L += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  return L;
}

/** Shortest-path angle interpolation. */
export function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
