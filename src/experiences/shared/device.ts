import { useSyncExternalStore } from "react";

/** Client-side capability snapshot used to scale both experiences down gracefully. */
export type DeviceProfile = {
  /** WebGL available at all. If false, skip 3D entirely. */
  webgl: boolean;
  /** Phones / weak GPUs: no shadows, no ambient occlusion, lower pixel ratio. */
  lowPower: boolean;
  /** OS "reduce motion": skip cinematic camera moves. */
  reducedMotion: boolean;
  /** Primary input is touch: show the on-screen joystick. */
  touch: boolean;
};

let cached: DeviceProfile | null = null;
const noopSubscribe = () => () => {};

/**
 * Hydration-safe device profile: `null` on the server and during hydration,
 * the real profile right after. Capabilities don't change at runtime, so it's cached.
 */
export function useDeviceProfile(): DeviceProfile | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => (cached ??= detectDevice()),
    () => null,
  );
}

export function detectDevice(): DeviceProfile {
  if (typeof window === "undefined")
    return { webgl: false, lowPower: true, reducedMotion: false, touch: false };
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return {
    webgl,
    touch,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    lowPower:
      touch ||
      window.matchMedia("(max-width: 760px)").matches ||
      navigator.hardwareConcurrency <= 4 ||
      memory <= 4,
  };
}
