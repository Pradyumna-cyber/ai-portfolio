/**
 * Which design the homepage (`/`) shows. Switching designs = changing ACTIVE_DESIGN.
 *
 *   "campus"   the walkable 3D campus (src/components/world/)
 *   "design1"  scroll-driven 3D film  (src/components/scroll/)       also at /scroll
 *
 *   "design2"  VR dive into a holographic Earth (src/components/design2/)  also at /vr
 *
 * Every design keeps its own URL too, so nothing disappears when it isn't the homepage.
 * The campus is always at /campus.
 * Exact snapshots are saved as git tags `design-1` and `design-2`.
 */
export const DESIGNS = ["campus", "design1", "design2"] as const;
export type DesignId = (typeof DESIGNS)[number];

export const ACTIVE_DESIGN: DesignId = "design2";
