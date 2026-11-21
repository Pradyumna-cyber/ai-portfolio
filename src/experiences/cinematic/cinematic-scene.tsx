"use client";
/* eslint-disable react-hooks/immutability -- the director moves the camera, objects and the DOM screen overlay per frame, by design. */
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OS_FOLDERS } from "@/components/pa-os/content";
import { screenIdleTexture } from "@/components/pa-os/idle-texture";
import { Character } from "../shared/character";
import type { CharacterDrive } from "../shared/motion";
import { FilmLook, Studio } from "../shared/studio";
import {
  canvasTexture,
  plankFloorTexture,
  plasterTexture,
  radialGlowTexture,
  seeded,
  woodTexture,
} from "../shared/textures";
import {
  cameraPath,
  easeInOut,
  fitDistance,
  lerpAngle,
  polylineAt,
  polylineLength,
  sequence,
} from "../shared/timeline";

/* ── set dressing coordinates (metres) ───────────────── */
/** 16:10 display, the same shape as the PA/OS idle image it shows. */
const DISPLAY_W = 0.98;
const DISPLAY = {
  w: DISPLAY_W,
  h: DISPLAY_W / 1.6,
  center: new THREE.Vector3(-0.55, 0.93 + DISPLAY_W / 1.6 / 2, -2.975),
};
const CHAIR = { x: -0.55, z: -1.75 };
const PATH: [number, number][] = [
  [4.6, 0.25],
  [2.4, -0.2],
  [0.6, -0.95],
  [-0.5, -1.18],
];
const WALK_SPEED = 1.3;
const SEAT_OFFSET = 0.06; // root sits slightly forward of the chair pivot
/** Where the camera rests after "Back to desk": a wide over-the-shoulder view of the seated character. */
const ROOM_SHOT = {
  pos: new THREE.Vector3(1.5, 1.7, 0.6),
  look: new THREE.Vector3(-0.55, 1.0, -2.3),
};

/** The whole film, beat by beat (seconds). */
export const FILM = sequence([
  { key: "establish", dur: 1.0 },
  { key: "walk", dur: polylineLength(PATH) / WALK_SPEED },
  { key: "turn", dur: 0.9 },
  { key: "sit", dur: 1.5 },
  { key: "settle", dur: 0.5 },
  { key: "swivel", dur: 1.7 },
  { key: "type", dur: 1.4 },
  { key: "push", dur: 2.1 },
] as const);
export type Beat = ReturnType<typeof FILM.at>["key"];

/**
 * film    the scripted intro
 * screen  camera parked facing the monitor (re-fitted on resize); the live PA/OS sits on it
 * room    pulled back to watch the seated character
 */
export type CineMode = "film" | "screen" | "room";
export type ScreenOverlay = { el: HTMLElement | null; fullscreen: boolean };

type Props = {
  mode: CineMode;
  /** Called once per beat change, so the DOM layer can react (letterbox, captions). */
  onBeat: (beat: Beat) => void;
  onFilmEnd: () => void;
  /** Camera has reached the monitor (after the film, or after returning from the room). */
  onArrive: () => void;
  skip: React.RefObject<boolean>;
  overlay: React.RefObject<ScreenOverlay>;
  lowPower: boolean;
};

export function CinematicScene(props: Props) {
  return (
    <>
      <Studio background="#0d1017" envIntensity={0.22} />
      <Lights lowPower={props.lowPower} />
      <Room />
      <Desk />
      <Director {...props} />
      <ScreenGlue overlay={props.overlay} />
      <FilmLook lowPower={props.lowPower} bloom={0.9} />
    </>
  );
}

/* ── the director: drives character, chair and camera from one clock ── */
function Director({
  mode,
  onBeat,
  onFilmEnd,
  onArrive,
  skip,
}: Omit<Props, "lowPower" | "overlay">) {
  const { camera, size } = useThree();
  const clock = useRef(0);
  const lastBeat = useRef<Beat | null>(null);
  const filmDone = useRef(false);
  const arrived = useRef(false);
  const character = useRef<THREE.Group>(null);
  const chair = useRef<THREE.Group>(null);
  const drive = useRef<CharacterDrive>({ a: { clip: "idle", t: 0 } });
  const cam = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      wantPos: new THREE.Vector3(),
      wantLook: new THREE.Vector3(),
    }),
    [],
  );
  const head = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    arrived.current = false;
  }, [mode]);

  const aspect = size.width / size.height;
  const path = useMemo(() => {
    // Portrait screens see less sideways, so pull every wide shot back a little.
    const pull = aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1;
    const shot = (t: number, pos: [number, number, number], look: [number, number, number]) => ({
      t,
      look,
      pos: [
        look[0] + (pos[0] - look[0]) * pull,
        look[1] + (pos[1] - look[1]) * pull,
        look[2] + (pos[2] - look[2]) * pull,
      ] as [number, number, number],
    });
    const d = fitDistance(camera as THREE.PerspectiveCamera, DISPLAY.w, DISPLAY.h, 1.04);
    const c = DISPLAY.center;
    return cameraPath([
      shot(0, [5.3, 2.7, 4.7], [0.5, 1.0, -1.3]),
      shot(FILM.start("walk") + 2.0, [4.0, 2.1, 3.4], [1.0, 1.0, -0.8]),
      shot(FILM.start("sit"), [2.7, 1.75, 2.2], [-0.3, 1.0, -1.3]),
      shot(FILM.start("swivel"), [1.35, 1.45, 0.6], [-0.55, 0.95, -1.7]),
      shot(FILM.start("type"), [0.4, 1.6, -0.75], [-0.55, 1.15, -2.9]),
      { t: FILM.start("push"), pos: [-0.22, 1.42, -1.5], look: [c.x, c.y, c.z] },
      { t: FILM.total, pos: [c.x, c.y, c.z + d], look: [c.x, c.y, c.z] },
    ]);
  }, [camera, aspect]);

  useFrame((_, dt) => {
    const ch = character.current;
    const chairG = chair.current;
    if (!ch || !chairG) return;

    if (mode === "film" && !filmDone.current) {
      if (skip.current) clock.current = FILM.total;
      clock.current = Math.min(FILM.total, clock.current + Math.min(dt, 0.05));
      const t = clock.current;
      const now = FILM.at(t);
      if (now.key !== lastBeat.current) {
        lastBeat.current = now.key;
        onBeat(now.key);
      }
      path.sample(t, cam.pos, cam.look);
      camera.position.copy(cam.pos);
      camera.lookAt(cam.look);
      performBeat(now, ch, chairG, drive);
      // The camera passes through where the head is during the final push; hide the body then.
      ch.visible = !(now.key === "push" && now.p > 0.3);
      if (t >= FILM.total) {
        filmDone.current = true;
        onFilmEnd();
      }
      return;
    }

    // After the film: the character keeps working at the desk.
    seatAtDesk(ch, chairG);
    drive.current = { a: { clip: "seatedType", t: performance.now() / 1000 } };

    if (mode === "room") {
      cam.wantPos.copy(ROOM_SHOT.pos);
      cam.wantLook.copy(ROOM_SHOT.look);
    } else {
      const c = DISPLAY.center;
      cam.wantLook.copy(c);
      cam.wantPos.set(
        c.x,
        c.y,
        c.z + fitDistance(camera as THREE.PerspectiveCamera, DISPLAY.w, DISPLAY.h, 1.04),
      );
    }
    const k = 1 - Math.exp(-dt * 2.8);
    cam.pos.lerp(cam.wantPos, k);
    cam.look.lerp(cam.wantLook, k);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);

    ch.getWorldPosition(head);
    head.y += 1.3;
    ch.visible = camera.position.distanceTo(head) > 0.55;

    if (mode === "screen" && !arrived.current && cam.pos.distanceTo(cam.wantPos) < 0.004) {
      arrived.current = true;
      onArrive();
    }
  });

  return (
    <>
      <group ref={chair} position={[CHAIR.x, 0, CHAIR.z]}>
        <OfficeChair />
      </group>
      <Character ref={character} drive={drive} />
    </>
  );
}

/** Pose the character and chair for one beat of the film. */
function performBeat(
  now: ReturnType<typeof FILM.at>,
  ch: THREE.Group,
  chairG: THREE.Group,
  drive: React.RefObject<CharacterDrive>,
) {
  const walkLen = polylineLength(PATH);
  const end = PATH[PATH.length - 1];
  switch (now.key) {
    case "establish": {
      const p = polylineAt(PATH, 0);
      ch.position.set(p.x, 0, p.z);
      ch.rotation.y = p.heading;
      drive.current = { a: { clip: "walk", t: 0 } };
      break;
    }
    case "walk": {
      const p = polylineAt(PATH, now.local * WALK_SPEED);
      ch.position.set(p.x, 0, p.z);
      ch.rotation.y = lerpAngle(ch.rotation.y, p.heading, 0.15);
      // Ease out of the stride over the last 0.35 s.
      const out = Math.min(1, Math.max(0, (now.local - (walkLen / WALK_SPEED - 0.35)) / 0.35));
      drive.current = { a: { clip: "walk", t: now.local }, b: { clip: "idle", t: 0 }, w: out };
      break;
    }
    case "turn":
      ch.position.set(end[0], 0, end[1]);
      ch.rotation.y = lerpAngle(polylineAt(PATH, walkLen).heading, 0, easeInOut(now.p));
      drive.current = { a: { clip: "turn", t: now.p } };
      break;
    case "sit": {
      // Back up onto the seat while bending down.
      const k = easeInOut(Math.min(1, now.p * 1.15));
      ch.position.set(
        end[0] + (CHAIR.x - end[0]) * k,
        0,
        end[1] + (CHAIR.z + SEAT_OFFSET - end[1]) * k,
      );
      ch.rotation.y = 0;
      drive.current = { a: { clip: "sit", t: now.p } };
      break;
    }
    case "settle":
      ch.position.set(CHAIR.x, 0, CHAIR.z + SEAT_OFFSET);
      drive.current = { a: { clip: "seatedIdle", t: now.local } };
      break;
    case "swivel":
      swivelTo(easeInOut(now.p) * Math.PI, ch, chairG);
      drive.current = {
        a: { clip: "seatedIdle", t: now.local },
        b: { clip: "seatedType", t: now.local },
        w: now.p,
      };
      return;
    default:
      seatAtDesk(ch, chairG);
      drive.current = { a: { clip: "seatedType", t: now.local + 2 } };
      return;
  }
  chairG.position.set(CHAIR.x, 0, CHAIR.z);
  chairG.rotation.y = 0;
}

/** Chair and seated character rotate together about the chair's pivot, rolling 15 cm towards the desk. */
function swivelTo(angle: number, ch: THREE.Group, chairG: THREE.Group) {
  const cz = CHAIR.z - 0.15 * (angle / Math.PI);
  chairG.position.set(CHAIR.x, 0, cz);
  chairG.rotation.y = angle;
  ch.position.set(CHAIR.x + Math.sin(angle) * SEAT_OFFSET, 0, cz + Math.cos(angle) * SEAT_OFFSET);
  ch.rotation.y = angle;
}
const seatAtDesk = (ch: THREE.Group, chairG: THREE.Group) => swivelTo(Math.PI, ch, chairG);

/** Keeps the live PA/OS DOM element exactly over the monitor's display rectangle. */
function ScreenGlue({ overlay }: { overlay: React.RefObject<ScreenOverlay> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const o = overlay.current;
    if (!o.el || o.fullscreen) return;
    const { center: c, w, h } = DISPLAY;
    v.set(c.x - w / 2, c.y + h / 2, c.z).project(camera);
    const x0 = ((v.x + 1) / 2) * size.width;
    const y0 = ((1 - v.y) / 2) * size.height;
    v.set(c.x + w / 2, c.y - h / 2, c.z).project(camera);
    const x1 = ((v.x + 1) / 2) * size.width;
    const y1 = ((1 - v.y) / 2) * size.height;
    const s = o.el.style;
    s.left = `${x0}px`;
    s.top = `${y0}px`;
    s.width = `${x1 - x0}px`;
    s.height = `${y1 - y0}px`;
  });
  return null;
}

/* ── lighting: moonlit room, warm practicals, monitor glow ── */
function Lights({ lowPower }: { lowPower: boolean }) {
  // A spotlight's target must live in the scene so its world matrix updates.
  const lampTarget = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <primitive object={lampTarget} position={[-0.4, 0, -1.6]} />
      <hemisphereLight args={["#8fa3c7", "#2a1c14", 0.35]} />
      {/* cool city/moon light through the window */}
      <directionalLight
        position={[3.5, 4.2, -6]}
        intensity={1.1}
        color="#9db7ff"
        castShadow={!lowPower}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* key: warm desk lamp */}
      <spotLight
        position={[-1.25, 1.35, -2.55]}
        angle={0.95}
        penumbra={0.8}
        intensity={9}
        distance={6}
        decay={1.6}
        color="#ffc27d"
        castShadow={!lowPower}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        target={lampTarget}
      />
      {/* warm floor lamp fill + monitor spill */}
      <pointLight
        position={[2.85, 1.55, -2.55]}
        intensity={3.2}
        distance={5.5}
        decay={1.6}
        color="#ffb067"
      />
      <pointLight
        position={[-0.55, 1.2, -2.6]}
        intensity={1.6}
        distance={2.5}
        decay={1.6}
        color="#8fb4ff"
      />
      {/* soft front fill so the character never goes black */}
      <directionalLight position={[3, 3, 6]} intensity={0.45} color="#ffe3c4" />
    </>
  );
}

function Room() {
  const t = useMemo(
    () => ({
      floor: plankFloorTexture([118, 82, 58], [6, 6]),
      wall: plasterTexture("#3a3f4a"),
      wallL: plasterTexture("#343944"),
      city: cityTexture(),
      glow: radialGlowTexture("rgba(255,180,100,0.7)"),
    }),
    [],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0, 6]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={t.floor} roughness={0.5} />
      </mesh>
      <mesh position={[6, 6, -3.2]} receiveShadow>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial map={t.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-3.6, 6, 6]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial map={t.wallL} roughness={0.95} />
      </mesh>

      {/* window with night skyline */}
      <group position={[1.75, 1.55, -3.19]}>
        <mesh>
          <planeGeometry args={[2.3, 1.7]} />
          <meshBasicMaterial map={t.city} toneMapped={false} />
        </mesh>
        {[
          [0, 0.87, 2.42, 0.07],
          [0, -0.87, 2.42, 0.07],
          [1.18, 0, 0.07, 1.8],
          [-1.18, 0, 0.07, 1.8],
          [0, 0, 0.04, 1.74],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]} castShadow>
            <boxGeometry args={[w, h, 0.06]} />
            <meshStandardMaterial color="#1b1e24" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.92, 0.1]} receiveShadow castShadow>
          <boxGeometry args={[2.5, 0.05, 0.24]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      </group>

      {/* floor lamp */}
      <group position={[2.85, 0, -2.55]}>
        <mesh position={[0, 0.015, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.03, 32]} />
          <meshStandardMaterial color="#1a1a1d" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 1.5, 12]} />
          <meshStandardMaterial color="#1a1a1d" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.17, 0.22, 0.3, 32, 1, true]} />
          <meshStandardMaterial
            color="#f3dcb8"
            emissive="#ffb067"
            emissiveIntensity={1.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* bookshelf on the left wall */}
      <group position={[-3.42, 0, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <Bookshelf />
      </group>

      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.4, 0.006, -1.55]} receiveShadow>
        <planeGeometry args={[2.6, 1.9]} />
        <meshStandardMaterial color="#5a4a3c" roughness={1} />
      </mesh>

      {/* floor plant */}
      <group position={[-3.05, 0, -2.75]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.17, 0.5, 32]} />
          <meshStandardMaterial color="#c9bba6" roughness={0.5} />
        </mesh>
        <Leaves count={14} height={0.95} spread={0.18} scale={[0.12, 0.42, 0.025]} />
      </group>
      <mesh position={[2.85, 1.6, -3.18]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial
          map={t.glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Desk() {
  const wood = useMemo(() => woodTexture("#6b4a33"), []);
  const screen = useMemo(() => screenIdleTexture(OS_FOLDERS.map((f) => f.name)), []);
  const c = DISPLAY.center;
  return (
    <group>
      {/* top + legs */}
      <RoundedBox
        args={[1.75, 0.05, 0.74]}
        radius={0.015}
        position={[-0.55, 0.735, -2.76]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial map={wood} roughness={0.45} />
      </RoundedBox>
      {[-1.35, 0.25].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.36, -2.45]} castShadow>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
            <meshStandardMaterial color="#141518" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[x, 0.36, -3.07]} castShadow>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
            <meshStandardMaterial color="#141518" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* monitor */}
      <mesh position={[c.x, 0.77, -2.95]} castShadow>
        <boxGeometry args={[0.26, 0.015, 0.18]} />
        <meshStandardMaterial color="#202227" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[c.x, 0.88, -3.0]} castShadow>
        <boxGeometry args={[0.05, 0.24, 0.03]} />
        <meshStandardMaterial color="#202227" metalness={0.7} roughness={0.3} />
      </mesh>
      <RoundedBox
        args={[DISPLAY.w + 0.03, DISPLAY.h + 0.03, 0.03]}
        radius={0.008}
        position={[c.x, c.y, c.z - 0.018]}
        castShadow
      >
        <meshStandardMaterial color="#0e0f12" roughness={0.35} />
      </RoundedBox>
      <mesh position={[c.x, c.y, c.z]}>
        <planeGeometry args={[DISPLAY.w, DISPLAY.h]} />
        <meshBasicMaterial
          map={screen}
          toneMapped={false}
          color={new THREE.Color(1.15, 1.15, 1.15)}
        />
      </mesh>
      {/* keyboard + mouse + mug */}
      <RoundedBox
        args={[0.44, 0.018, 0.14]}
        radius={0.006}
        position={[c.x, 0.77, -2.52]}
        castShadow
      >
        <meshStandardMaterial color="#d9d6cf" roughness={0.5} />
      </RoundedBox>
      <mesh position={[c.x + 0.34, 0.772, -2.5]} scale={[0.032, 0.016, 0.055]} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#d9d6cf" roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.81, -2.7]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.1, 24]} />
        <meshStandardMaterial color="#c46a45" roughness={0.3} />
      </mesh>
      {/* desk lamp */}
      <group position={[-1.25, 0.76, -2.95]}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.024, 24]} />
          <meshStandardMaterial color="#17181b" />
        </mesh>
        <mesh position={[0.06, 0.28, 0.08]} rotation={[0.35, 0, -0.2]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.56, 10]} />
          <meshStandardMaterial color="#17181b" metalness={0.5} />
        </mesh>
        <mesh position={[0.1, 0.57, 0.28]} rotation={[0.9, 0, 0]} castShadow>
          <coneGeometry args={[0.08, 0.13, 24, 1, true]} />
          <meshStandardMaterial color="#17181b" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.1, 0.54, 0.31]}>
          <sphereGeometry args={[0.028, 12, 10]} />
          <meshBasicMaterial
            color={new THREE.Color("#ffd9a0").multiplyScalar(4)}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* small plant */}
      <group position={[0.12, 0.76, -2.98]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.12, 24]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.5} />
        </mesh>
        <Leaves count={9} height={0.17} spread={0.03} scale={[0.03, 0.1, 0.01]} />
      </group>
    </group>
  );
}

function OfficeChair() {
  const { fabric, metal } = useMemo(
    () => ({
      fabric: new THREE.MeshStandardMaterial({ color: "#2b2d33", roughness: 0.9 }),
      metal: new THREE.MeshStandardMaterial({ color: "#8d9097", metalness: 0.8, roughness: 0.25 }),
    }),
    [],
  );
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <mesh position={[0.15, 0.06, 0]} material={metal} castShadow>
            <boxGeometry args={[0.3, 0.025, 0.04]} />
          </mesh>
          <mesh position={[0.29, 0.028, 0]} castShadow>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.25, 0]} material={metal} castShadow>
        <cylinderGeometry args={[0.024, 0.03, 0.36, 16]} />
      </mesh>
      <RoundedBox
        args={[0.5, 0.08, 0.48]}
        radius={0.035}
        position={[0, 0.45, 0]}
        material={fabric}
        castShadow
        receiveShadow
      />
      {/* backrest behind the sitter (sitter faces +Z when the chair is at rotation 0) */}
      <RoundedBox
        args={[0.46, 0.62, 0.06]}
        radius={0.03}
        position={[0, 0.85, -0.25]}
        rotation={[0.1, 0, 0]}
        material={fabric}
        castShadow
      />
      {[-0.27, 0.27].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.58, -0.02]} material={metal} castShadow>
            <boxGeometry args={[0.025, 0.2, 0.025]} />
          </mesh>
          <RoundedBox
            args={[0.06, 0.025, 0.24]}
            radius={0.01}
            position={[x, 0.69, 0.0]}
            material={fabric}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}

function Bookshelf() {
  const r = seeded(21);
  const colors = ["#7b3f2a", "#2f4a6b", "#c9a35d", "#3d5e48", "#8c8579", "#5b2f45"];
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 2.0, 0.32]} />
        <meshStandardMaterial color="#1e1f23" roughness={0.7} />
      </mesh>
      {[0.42, 0.86, 1.3, 1.74].map((y) =>
        Array.from({ length: 11 }, (_, i) => {
          const h = 0.2 + r() * 0.12;
          return (
            <mesh
              key={`${y}-${i}`}
              position={[-0.45 + i * 0.075 + r() * 0.01, y - 0.2 + h / 2, 0.06]}
              castShadow
            >
              <boxGeometry args={[0.06, h, 0.2]} />
              <meshStandardMaterial
                color={colors[Math.floor(r() * colors.length)]}
                roughness={0.8}
              />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function Leaves({
  count,
  height,
  spread,
  scale,
}: {
  count: number;
  height: number;
  spread: number;
  scale: [number, number, number];
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * spread,
              height + (i % 3) * scale[1] * 0.3,
              Math.sin(a) * spread,
            ]}
            rotation={[Math.sin(a) * 0.55, a, Math.cos(a) * 0.55]}
            scale={scale}
            castShadow
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={i % 2 ? "#3f7a52" : "#55946a"} roughness={0.7} />
          </mesh>
        );
      })}
    </>
  );
}

/* ── textures ────────────────────────────────────────── */
function cityTexture() {
  const r = seeded(9);
  return canvasTexture(512, 384, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 384);
    g.addColorStop(0, "#0b1a33");
    g.addColorStop(0.7, "#24345a");
    g.addColorStop(1, "#4a3a52");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 384);
    let x = 0;
    while (x < 512) {
      const w = 26 + r() * 50;
      const h = 90 + r() * 200;
      c.fillStyle = `rgb(${12 + r() * 14},${16 + r() * 16},${30 + r() * 20})`;
      c.fillRect(x, 384 - h, w, h);
      for (let wy = 384 - h + 8; wy < 380; wy += 11)
        for (let wx = x + 5; wx < x + w - 5; wx += 8)
          if (r() > 0.62) {
            c.fillStyle = r() > 0.3 ? "rgba(255,206,140,0.9)" : "rgba(170,210,255,0.85)";
            c.fillRect(wx, wy, 4, 5);
          }
      x += w + 2;
    }
  });
}
