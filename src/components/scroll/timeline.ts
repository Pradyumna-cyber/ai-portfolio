import * as THREE from "three";
import type { Shot } from "@/experiences/shared/timeline";
import { portfolio } from "@/content/portfolio";

/**
 * Scroll film: six chapters, one per page section. Scroll position becomes a chapter
 * time `t` in [0, LAST] (integer = that section is aligned with the viewport top), which
 * drives the camera path and the node formations.
 */
export const CHAPTERS = [
  "hero",
  "thesis",
  "experience",
  "projects",
  "principles",
  "contact",
] as const;
export type Chapter = (typeof CHAPTERS)[number];
export const LAST = CHAPTERS.length - 1;

/** One camera shot per chapter; `t` is the chapter index. */
export const SHOTS: Shot[] = [
  { t: 0, pos: [0, 0.2, 7.5], look: [0, 0, 0] },
  { t: 1, pos: [5.2, 1.4, 4.2], look: [0.4, 0, 0] },
  { t: 2, pos: [0, 4.8, 6.8], look: [0, -0.2, 0] },
  { t: 3, pos: [0, 0.7, 8.4], look: [0, 0, 2.6] },
  { t: 4, pos: [-1.4, 7.4, 3.6], look: [-2.2, 0, 0.3] },
  { t: 5, pos: [0, 0.1, 6.4], look: [0, 0, 0] },
];

/**
 * Raw scroll → chapter time. `tops` are the section offsets (px), `y` is scrollY,
 * `max` is the largest possible scrollY. Pure, so it is unit-testable.
 */
export function chapterTime(tops: number[], y: number, max: number): number {
  const n = tops.length;
  if (n === 0) return 0;
  if (y >= max - 1) return n - 1;
  for (let i = n - 2; i >= 0; i--) {
    if (y >= tops[i]) {
      const span = Math.max(1, tops[i + 1] - tops[i]);
      return Math.min(n - 1, i + (y - tops[i]) / span);
    }
  }
  return 0;
}

/**
 * Shapes the linear chapter time before it reaches the camera and the formations.
 * `t` is in [0, LAST]; the integer part is the chapter, the fractional part is how far
 * the reader has scrolled towards the next one. Must return a value in [0, LAST] and
 * must be monotonic (scrolling down never moves the film backwards).
 */
export function shapeProgress(t: number): number {
  // TODO(human): decide how the film "dwells" on each chapter.
  return t;
}

/* ── node formations ─────────────────────────────────────── */

export const NODE_COUNT = 72;
/** The principles chapter arranges the nodes into one cluster per published principle. */
const CLUSTERS = Math.max(1, portfolio.principles.length);

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type Formations = { byChapter: THREE.Vector3[][]; pairs: [number, number][] };

export function buildFormations(): Formations {
  const rand = seeded(7);
  // Evenly spread directions on a unit sphere (Fibonacci lattice).
  const dirs = Array.from({ length: NODE_COUNT }, (_, i) => {
    const y = 1 - ((i + 0.5) / NODE_COUNT) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
  });
  const jitter = dirs.map(() => rand());
  const sphere = (scale: number) => dirs.map((d) => d.clone().multiplyScalar(1.35 * scale));
  const exploded = dirs.map((d, i) => d.clone().multiplyScalar(1.7 + jitter[i] * 2.4));
  const clusters = dirs.map((d, i) => {
    const a = ((i % CLUSTERS) / CLUSTERS) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6).add(
      d.clone().multiplyScalar(0.32 + jitter[i] * 0.12),
    );
  });

  // Connect each node to its three nearest neighbours in the assembled sphere.
  const base = sphere(1);
  const seen = new Set<string>();
  const pairs: [number, number][] = [];
  base.forEach((p, i) => {
    base
      .map((q, j) => ({ j, d: p.distanceToSquared(q) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([i, j]);
        }
      });
  });

  return {
    // hero, thesis, experience, projects, principles, contact
    byChapter: [sphere(1), exploded, sphere(0.75), sphere(0.42), clusters, sphere(1)],
    pairs,
  };
}

/** 1 when `t` sits on chapter `c`, falling linearly to 0 one chapter away. */
export const weightAt = (t: number, c: number) => Math.max(0, 1 - Math.abs(t - c));
