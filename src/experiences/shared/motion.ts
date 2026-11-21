/**
 * Procedural animation clips for the stand-in character.
 *
 * Both scenarios drive the character only through `CharacterDrive` (clip name + time),
 * never through joint angles. A real rigged avatar (.glb + Mixamo clips) can later
 * implement the same drive with an AnimationMixer, without touching scenario code.
 *
 * Conventions: the character faces +Z, its left is +X.
 *  - torso / head  +x rotation = lean / nod forward
 *  - legs          -x = thigh swings forward,  +x on knee = knee bends
 *  - arms          -x = arm raises forward,    -x on elbow = elbow bends
 *  - left arm      +z = moves outward (right arm: -z)
 */
export const JOINTS = [
  "pelvis",
  "spine",
  "chest",
  "neck",
  "head",
  "shoulderL",
  "elbowL",
  "shoulderR",
  "elbowR",
  "thighL",
  "kneeL",
  "ankleL",
  "thighR",
  "kneeR",
  "ankleR",
] as const;
export type Joint = (typeof JOINTS)[number];
export type Rot = [number, number, number];

export type Pose = {
  /** Vertical offset of the hips from standing height (metres). */
  hipsY: number;
  /** Forward (+) / backward (−) offset of the hips (metres). */
  hipsZ: number;
  rot: Record<Joint, Rot>;
};

/** Looping clips take time in seconds; one-shot clips take progress 0..1. */
export type LoopClip = "idle" | "walk" | "seatedIdle" | "seatedType";
export type OneShotClip = "sit" | "pickUp" | "wear" | "turn";
export type ClipName = LoopClip | OneShotClip;
export type ClipSample = { clip: ClipName; t: number };
/** What a scenario asks the character to do this frame: clip `a`, optionally cross-faded into `b`. */
export type CharacterDrive = { a: ClipSample; b?: ClipSample; w?: number };

/* ── helpers ─────────────────────────────────────────── */
const TAU = Math.PI * 2;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Remap x from [a,b] to [0,1] and smooth it. */
const span = (x: number, a: number, b: number) => smooth((x - a) / (b - a));

function base(): Pose {
  const rot = {} as Record<Joint, Rot>;
  for (const j of JOINTS) rot[j] = [0, 0, 0];
  return { hipsY: 0, hipsZ: 0, rot };
}

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = base();
  out.hipsY = mix(a.hipsY, b.hipsY, t);
  out.hipsZ = mix(a.hipsZ, b.hipsZ, t);
  for (const j of JOINTS) {
    const ra = a.rot[j];
    const rb = b.rot[j];
    out.rot[j] = [mix(ra[0], rb[0], t), mix(ra[1], rb[1], t), mix(ra[2], rb[2], t)];
  }
  return out;
}

/* ── clips ───────────────────────────────────────────── */
function idle(t: number): Pose {
  const p = base();
  const breath = Math.sin(t * 1.7);
  p.rot.chest = [0.02 * breath, 0, 0];
  p.rot.head = [0.04 + 0.015 * Math.sin(t * 0.6), 0.08 * Math.sin(t * 0.35), 0];
  p.rot.shoulderL = [0.02 * breath, 0, 0.09];
  p.rot.shoulderR = [0.02 * breath, 0, -0.09];
  p.rot.elbowL = [-0.14, 0, 0];
  p.rot.elbowR = [-0.14, 0, 0];
  p.hipsY = -0.004 * (1 + breath);
  return p;
}

/** Natural walk cycle: ~1.05 s per stride (two steps). */
function walk(t: number): Pose {
  const p = base();
  const phi = (t / 1.05) * TAU;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  // Legs swing in opposition; knees flex during the swing phase.
  p.rot.thighL = [-0.44 * s, 0, 0];
  p.rot.thighR = [0.44 * s, 0, 0];
  const kneeL = 0.1 + 0.8 * Math.max(0, c) ** 1.4;
  const kneeR = 0.1 + 0.8 * Math.max(0, -c) ** 1.4;
  p.rot.kneeL = [kneeL, 0, 0];
  p.rot.kneeR = [kneeR, 0, 0];
  // Keep feet roughly parallel to the floor.
  p.rot.ankleL = [-(-0.44 * s + kneeL) * 0.6, 0, 0];
  p.rot.ankleR = [-(0.44 * s + kneeR) * 0.6, 0, 0];
  // Arms counter-swing; elbows bend more on the forward swing.
  p.rot.shoulderL = [0.34 * s, 0, 0.07];
  p.rot.shoulderR = [-0.34 * s, 0, -0.07];
  p.rot.elbowL = [-0.22 - 0.3 * Math.max(0, -s), 0, 0];
  p.rot.elbowR = [-0.22 - 0.3 * Math.max(0, s), 0, 0];
  // Pelvis twist, counter-rotating chest, slight forward lean, vertical bob.
  p.rot.pelvis = [0, 0.11 * s, 0];
  p.rot.spine = [0.06, 0, 0];
  p.rot.chest = [0, -0.14 * s, 0];
  p.rot.head = [0.02, 0.03 * s, 0];
  p.hipsY = -0.028 * Math.abs(s);
  return p;
}

/** Seated pose (on a ~0.48 m seat), hands resting on the thighs. */
function seatedIdle(t: number): Pose {
  const p = base();
  const breath = Math.sin(t * 1.5);
  p.hipsY = -0.4;
  p.hipsZ = -0.04;
  p.rot.thighL = [-1.5, 0, 0.05];
  p.rot.thighR = [-1.5, 0, -0.05];
  p.rot.kneeL = [1.45, 0, 0];
  p.rot.kneeR = [1.45, 0, 0];
  p.rot.spine = [-0.04, 0, 0];
  p.rot.chest = [0.02 * breath, 0, 0];
  p.rot.head = [0.06, 0, 0];
  p.rot.shoulderL = [-0.35, 0, 0.12];
  p.rot.shoulderR = [-0.35, 0, -0.12];
  p.rot.elbowL = [-0.75, 0, 0];
  p.rot.elbowR = [-0.75, 0, 0];
  return p;
}

/** Seated, leaning slightly in with hands on a keyboard. */
function seatedType(t: number): Pose {
  const p = seatedIdle(t);
  p.rot.spine = [0.12, 0, 0];
  p.rot.head = [0.16 + 0.02 * Math.sin(t * 0.8), 0.04 * Math.sin(t * 0.5), 0];
  p.rot.shoulderL = [-0.72, 0, 0.2];
  p.rot.shoulderR = [-0.72, 0, -0.2];
  p.rot.elbowL = [-0.85 + 0.05 * Math.sin(t * 11), 0, 0];
  p.rot.elbowR = [-0.85 + 0.05 * Math.sin(t * 13 + 1), 0, 0];
  return p;
}

/** Standing → seated. Knees bend first, torso leans to counterbalance, hips drop back. */
function sit(x: number): Pose {
  const from = idle(0);
  const to = seatedIdle(0);
  const k = span(x, 0, 1);
  const p = mixPose(from, to, k);
  p.hipsY = mix(0, to.hipsY, span(x, 0.15, 1));
  p.rot.spine = [mix(0, to.rot.spine[0], k) + 0.42 * Math.sin(Math.PI * clamp01(x)), 0, 0];
  p.rot.shoulderL[0] -= 0.35 * Math.sin(Math.PI * clamp01(x));
  p.rot.shoulderR[0] -= 0.35 * Math.sin(Math.PI * clamp01(x));
  return p;
}

/** In-place 180° turn: small stepping motion (the root rotation is done by the scenario). */
function turn(x: number): Pose {
  const p = idle(0);
  const step = Math.sin(clamp01(x) * Math.PI * 2);
  p.rot.thighL = [-0.25 * Math.max(0, step), 0, 0];
  p.rot.kneeL = [0.45 * Math.max(0, step), 0, 0];
  p.rot.thighR = [-0.25 * Math.max(0, -step), 0, 0];
  p.rot.kneeR = [0.45 * Math.max(0, -step), 0, 0];
  p.hipsY = -0.015 * Math.abs(step);
  return p;
}

/** Reach forward/down to a table, grab, and bring the object up to the chest (right hand). */
function pickUp(x: number): Pose {
  const p = idle(0);
  const reach = span(x, 0, 0.45) * (1 - span(x, 0.55, 1));
  const lift = span(x, 0.5, 1);
  p.rot.spine = [0.38 * reach + 0.04 * lift, 0, 0];
  p.rot.head = [0.35 * reach + 0.12 * lift, 0, 0];
  p.rot.kneeL = [0.18 * reach, 0, 0];
  p.rot.kneeR = [0.18 * reach, 0, 0];
  p.rot.thighL = [-0.12 * reach, 0, 0];
  p.rot.thighR = [-0.12 * reach, 0, 0];
  p.hipsY = -0.05 * reach;
  p.rot.shoulderR = [mix(-1.05 * reach, -0.85, lift), 0, -0.12];
  p.rot.elbowR = [mix(-0.25, -1.65, lift), 0, 0];
  p.rot.shoulderL = [-0.25 * lift, 0, 0.12];
  p.rot.elbowL = [-0.14 - 1.2 * lift, 0, 0];
  return p;
}

/** Both hands raise an object (headset) up to the face, hold, then lower the arms. */
function wear(x: number): Pose {
  const p = idle(0);
  const up = span(x, 0, 0.55) * (1 - span(x, 0.8, 1));
  // Upper arms ~70° forward, elbows ~92°: hands meet ~25 cm in front of the eyes.
  p.rot.shoulderL = [mix(-0.25, -1.2, up), 0, mix(0.12, 0.08, up)];
  p.rot.shoulderR = [mix(-0.85, -1.2, up), 0, mix(-0.12, -0.08, up)];
  p.rot.elbowL = [mix(-1.34, -1.6, up), 0, 0];
  p.rot.elbowR = [mix(-1.65, -1.6, up), 0, 0];
  const settle = span(x, 0.8, 1);
  p.rot.shoulderL = [mix(p.rot.shoulderL[0], 0, settle), 0, mix(p.rot.shoulderL[2], 0.09, settle)];
  p.rot.shoulderR = [mix(p.rot.shoulderR[0], 0, settle), 0, mix(p.rot.shoulderR[2], -0.09, settle)];
  p.rot.elbowL = [mix(p.rot.elbowL[0], -0.14, settle), 0, 0];
  p.rot.elbowR = [mix(p.rot.elbowR[0], -0.14, settle), 0, 0];
  p.rot.head = [0.05 - 0.12 * up, 0, 0];
  return p;
}

const CLIPS: Record<ClipName, (t: number) => Pose> = {
  idle,
  walk,
  seatedIdle,
  seatedType,
  sit,
  turn,
  pickUp,
  wear,
};

export function samplePose(s: ClipSample): Pose {
  return CLIPS[s.clip](s.t);
}

export function evaluateDrive(d: CharacterDrive): Pose {
  const a = samplePose(d.a);
  if (!d.b || !d.w) return a;
  return mixPose(a, samplePose(d.b), clamp01(d.w));
}
