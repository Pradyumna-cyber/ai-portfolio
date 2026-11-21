/**
 * Immersive prototypes. Only the cinematic scenario remains (the VR world was removed);
 * it is served at `/immersive` and `/immersive/cinematic`.
 */
export const EXPERIENCES = ["cinematic"] as const;
export type ExperienceId = (typeof EXPERIENCES)[number];
export const DEFAULT_EXPERIENCE: ExperienceId = "cinematic";
