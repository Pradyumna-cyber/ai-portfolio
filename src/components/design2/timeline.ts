import * as THREE from "three";
import type { Shot } from "@/experiences/shared/timeline";

/**
 * Design 2: a scroll film in two acts.
 *   Act 1 (t 0 → 1.5): a man wearing a VR headset; the camera pushes into the visor.
 *   Act 2 (t 1.5 → LAST): inside the headset, a holographic Earth; one chapter per section.
 * The cut between the acts happens at t = CUT, hidden by a full-screen flash.
 */
export const CHAPTERS = [
  "hero",
  "dive",
  "about",
  "projects",
  "build",
  "experience",
  "beliefs",
  "toolkit",
  "contact",
] as const;
export type Chapter = (typeof CHAPTERS)[number];
export const LAST = CHAPTERS.length - 1;
export const CUT = 1.5;

/** Act 1 camera, around the head (head centre at the origin, visor faces +Z). */
export const BUST_SHOTS: Shot[] = [
  { t: 0, pos: [0, 0.02, 3.9], look: [0, -0.12, 0] },
  { t: 1, pos: [0, 0.12, 0.95], look: [0, 0.12, 0] },
];

/** Act 2 camera, around the Earth (radius EARTH_R at the origin). Shot i is chapter i + 1. */
export const WORLD_SHOTS: Shot[] = [
  { t: 0, pos: [0, 1.2, 18], look: [0, 0, 0] }, // arrival (at t = CUT)
  { t: 1, pos: [-2.2, 0.6, 6.6], look: [-1.5, 0.1, 0] }, // about: Earth on the right
  { t: 2, pos: [2.6, 2.4, 6.2], look: [0, -1.1, 0] }, // projects: Earth high, cards below
  { t: 3, pos: [-1.2, 0.9, 11.5], look: [-3.6, 0.3, 0] }, // build: Earth small, far right
  { t: 4, pos: [7.4, 2, 3.4], look: [0.6, -0.3, -1.6] }, // experience: Earth on the left
  { t: 5, pos: [-3.4, -1.8, 5.2], look: [-1.5, 0, 0] }, // beliefs: Earth on the right
  { t: 6, pos: [3.6, 1.4, 8.6], look: [1.6, 0.2, 0] }, // toolkit: Earth on the left
  { t: 7, pos: [0, 0.5, 7.4], look: [0, 0.1, 0] }, // contact: Earth centred
];

/** Chapter time → time along the world path (0 at the cut, 1 at "about", …). */
export const worldTime = (t: number) => (t < 2 ? Math.max(0, (t - CUT) * 2) : t - 1);

/** Full-screen flash that hides the cut: 0 → 1 → 0 around t = CUT. */
export function flashAt(t: number) {
  const x = 1 - Math.abs(t - CUT) / 0.32;
  return x <= 0 ? 0 : x * x * (3 - 2 * x);
}

/** 1 on chapter `c`, falling linearly to 0 one chapter away. */
export const weightAt = (t: number, c: number) => Math.max(0, 1 - Math.abs(t - c));

/** Section offsets + scrollY → chapter time in [0, sections − 1]. */
export function chapterTime(tops: number[], y: number, max: number): number {
  const n = tops.length;
  if (n === 0) return 0;
  if (y >= max - 1) return n - 1;
  for (let i = n - 2; i >= 0; i--) {
    if (y >= tops[i])
      return Math.min(n - 1, i + (y - tops[i]) / Math.max(1, tops[i + 1] - tops[i]));
  }
  return 0;
}

/* ── Earth geometry ─────────────────────────────────────── */

export const EARTH_R = 2;

/** Latitude/longitude (degrees) → point on a sphere, matching THREE.SphereGeometry's UVs. */
export function latLon(lat: number, lon: number, r: number, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = ((lon + 180) / 360) * Math.PI * 2;
  return out.set(
    -r * Math.cos(phi) * Math.cos(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(theta),
  );
}

/** Thane, deliberately rounded to ~1 km so it is near, not exact. */
export const HOME = { lat: 19.19, lon: 72.97 };
export const CITIES = {
  thane: HOME,
  london: { lat: 51.5, lon: -0.13 },
  sf: { lat: 37.77, lon: -122.42 },
  nyc: { lat: 40.71, lon: -74.0 },
  singapore: { lat: 1.35, lon: 103.82 },
  tokyo: { lat: 35.68, lon: 139.69 },
  dubai: { lat: 25.2, lon: 55.27 },
  frankfurt: { lat: 50.11, lon: 8.68 },
  sydney: { lat: -33.87, lon: 151.21 },
  saopaulo: { lat: -23.55, lon: -46.63 },
} as const;
export type City = keyof typeof CITIES;
/** Network routes drawn as arcs with travelling data packets. Thane's routes glow orange. */
export const ROUTES: [City, City][] = [
  ["thane", "london"],
  ["thane", "singapore"],
  ["thane", "dubai"],
  ["thane", "sf"],
  ["thane", "frankfurt"],
  ["thane", "tokyo"],
  ["london", "nyc"],
  ["nyc", "sf"],
  ["sf", "tokyo"],
  ["singapore", "sydney"],
  ["frankfurt", "dubai"],
  ["nyc", "saopaulo"],
];

/** Points along the great circle a → b, lifted into an arc. */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 64) {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const r = a.length();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const p = new THREE.Vector3()
      .addScaledVector(ua, Math.sin((1 - s) * angle) / Math.sin(angle))
      .addScaledVector(ub, Math.sin(s * angle) / Math.sin(angle));
    pts.push(p.multiplyScalar(r * (1 + 0.22 * angle * Math.sin(Math.PI * s))));
  }
  return pts;
}

/* ── Sun position (real time) ───────────────────────────── */

/**
 * Sub-solar point (where the sun is directly overhead) for a moment in time, accurate to
 * about a degree: longitude from UTC time, latitude from the seasonal declination.
 */
export function subsolarPoint(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86_400_000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lon = (((((12 - hours) * 15 + 180) % 360) + 360) % 360) - 180;
  return { lat: decl, lon };
}

/** Is it daytime at this place right now? (sun above the horizon) */
export function isDaylight(place: { lat: number; lon: number }, date: Date) {
  const sun = subsolarPoint(date);
  return latLon(place.lat, place.lon, 1).dot(latLon(sun.lat, sun.lon, 1)) > 0;
}

/** Current time in India (IST, UTC+05:30) as HH:MM. */
export function istClock(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
