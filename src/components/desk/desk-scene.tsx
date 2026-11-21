"use client";
/* eslint-disable react-hooks/immutability -- frame callbacks move the camera, DOM overlays and Three.js objects imperatively, by design (same pattern as world/scene.tsx). */
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  N8AO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { portfolio } from "@/content/portfolio";
import { OS_FOLDERS } from "./os-content";
import {
  floorTexture,
  glowTexture,
  plasterTexture,
  screenIdleTexture,
  skyTexture,
  spineTexture,
  woodTexture,
} from "./textures";

/* ── palette ─────────────────────────────────────────── */
const C = {
  wall: "#dcc9ae",
  wallLeft: "#d2bd9f",
  charcoal: "#2a2b30",
  foam: "#26272c",
  navy: "#2c3148",
  cream: "#efe7da",
  green: "#4b8a5c",
  curtain: "#3b5872",
  chair: "#c9cbd0",
};

/* ── the monitor's display, in world space ───────────── */
export const SCREEN = {
  center: new THREE.Vector3(0.1, 1.36, -1.8),
  width: 1.36,
  height: 0.85,
};

export type DeskMode = "desk" | "screen";
export type OverlayRefs = {
  /** DOM element that is kept glued to the monitor's display rectangle. */
  screen: HTMLElement | null;
  /** DOM pin floating above the monitor in desk mode. */
  pin: HTMLElement | null;
  /** When true the OS has gone full-viewport (phones) and must not be re-positioned. */
  fullscreen: boolean;
};

type Props = {
  mode: DeskMode;
  onEnter: () => void;
  onArrive: () => void;
  overlay: React.RefObject<OverlayRefs>;
  reducedMotion: boolean;
  lowPower: boolean;
};

export function DeskScene({ mode, onEnter, onArrive, overlay, reducedMotion, lowPower }: Props) {
  return (
    <>
      <CameraRig mode={mode} onArrive={onArrive} reducedMotion={reducedMotion} />
      <OverlayProjector overlay={overlay} />
      <Studio />
      <Lights lowPower={lowPower} />
      <Room />
      <Desk />
      <Monitor mode={mode} onEnter={onEnter} />
      <Shelf />
      <AcousticPanel position={[-1.38, 1.62, -2.18]} />
      <AcousticPanel position={[1.78, 1.62, -2.18]} />
      <Speaker position={[-0.86, 0.79, -1.78]} />
      <Speaker position={[1.0, 0.79, -1.78]} />
      <PcTower />
      <DeskTop />
      <Robot reducedMotion={reducedMotion} />
      <Mug reducedMotion={reducedMotion} />
      <Chair />
      <FloorPlant />
      <Effects lowPower={lowPower} />
    </>
  );
}

/* ── image-based lighting, generated locally (no HDR download) ── */
function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    scene.background = new THREE.Color(C.wall);
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ── post-processing: what makes it read as a "render" ── */
function Effects({ lowPower }: { lowPower: boolean }) {
  if (lowPower)
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
        <Vignette offset={0.3} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <HueSaturation saturation={0.16} />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.45} distanceFalloff={0.8} intensity={2.6} quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.75} radius={0.7} />
      <Vignette offset={0.3} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      {/* AgX is deliberately neutral; nudge it toward a "look" like a Blender grade. */}
      <HueSaturation saturation={0.16} />
      <BrightnessContrast contrast={0.08} />
    </EffectComposer>
  );
}

/* ── camera: fits the room to any viewport, or flies to face the monitor ── */
function CameraRig({
  mode,
  onArrive,
  reducedMotion,
}: {
  mode: DeskMode;
  onArrive: () => void;
  reducedMotion: boolean;
}) {
  const { camera, size, pointer } = useThree();
  const pos = useRef<THREE.Vector3 | null>(null);
  const target = useRef(new THREE.Vector3(0.15, 1.2, -1.5));
  const shift = useRef(0);
  const arrived = useRef(false);
  const want = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  useEffect(() => {
    arrived.current = false;
  }, [mode]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);

    if (mode === "screen") {
      // Face the display head-on, close enough that it (plus a sliver of bezel) fills the view.
      const m = 1.07;
      const d = Math.max(
        ((SCREEN.height / 2) * m) / Math.tan(vHalf),
        ((SCREEN.width / 2) * m) / Math.tan(hHalf),
      );
      want.target.copy(SCREEN.center);
      want.pos.set(SCREEN.center.x, SCREEN.center.y, SCREEN.center.z + d);
    } else {
      // Room view: fit a sphere around the desk. Oversized walls fill any leftover space.
      const radius = aspect < 0.8 ? 1.65 : 2.0;
      const d = radius / Math.sin(Math.min(vHalf, hHalf));
      const sway = reducedMotion ? 0 : 1;
      const az = 0.66 + pointer.x * 0.08 * sway;
      const el = 0.3 + pointer.y * 0.035 * sway;
      want.target.set(0.15, 1.2, -1.5);
      want.pos.set(
        want.target.x + d * Math.cos(el) * Math.sin(az),
        want.target.y + d * Math.sin(el),
        want.target.z + d * Math.cos(el) * Math.cos(az),
      );
    }

    if (!pos.current) pos.current = want.pos.clone();
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 2.6);
    pos.current.lerp(want.pos, k);
    target.current.lerp(want.target, k);

    // Wide screens: slide the image right of the headline card (desk mode only).
    const wantShift = mode === "desk" && size.width > 900 ? -size.width * 0.12 : 0;
    shift.current += (wantShift - shift.current) * k;
    cam.setViewOffset(size.width, size.height, shift.current, 0, size.width, size.height);
    cam.updateProjectionMatrix();

    cam.position.copy(pos.current);
    cam.lookAt(target.current);

    if (mode === "screen" && !arrived.current && pos.current.distanceTo(want.pos) < 0.004) {
      arrived.current = true;
      onArrive();
    }
  });
  return null;
}

/** Keeps DOM overlays glued to 3D positions: the monitor pin, and the OS on the display. */
function OverlayProjector({ overlay }: { overlay: React.RefObject<OverlayRefs> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const toScreen = (x: number, y: number, z: number) => {
    v.set(x, y, z).project(camera);
    return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height] as const;
  };
  useFrame(() => {
    const o = overlay.current;
    if (!o) return;
    if (o.pin) {
      const [x, y] = toScreen(
        SCREEN.center.x,
        SCREEN.center.y + SCREEN.height / 2 + 0.12,
        SCREEN.center.z,
      );
      o.pin.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
    if (o.screen && !o.fullscreen) {
      const { center: c, width: w, height: h } = SCREEN;
      const [x0, y0] = toScreen(c.x - w / 2, c.y + h / 2, c.z);
      const [x1, y1] = toScreen(c.x + w / 2, c.y - h / 2, c.z);
      const s = o.screen.style;
      s.left = `${x0}px`;
      s.top = `${y0}px`;
      s.width = `${x1 - x0}px`;
      s.height = `${y1 - y0}px`;
    }
  });
  return null;
}

function Lights({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <hemisphereLight args={["#fff1de", "#6b4a32", 0.35]} />
      {/* key light: low evening sun through the window */}
      <directionalLight
        position={[-5.5, 4.2, 0.2]}
        intensity={2.6}
        color="#ffd2a1"
        castShadow={!lowPower}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[5, 3.5, 6]} intensity={0.35} color="#d6e2ff" />
      {/* monitor bias light, shelf strip, PC fans */}
      <pointLight
        position={[0.1, 1.4, -2.05]}
        intensity={2.2}
        distance={2.4}
        decay={1.6}
        color="#5d7dff"
      />
      <pointLight position={[0.1, 1.9, -1.98]} intensity={1.1} distance={1.4} color="#ffbf73" />
      <pointLight position={[1.32, 1.05, -1.5]} intensity={0.9} distance={1.1} color="#53c7ff" />
    </>
  );
}

/* ── primitives ──────────────────────────────────────── */
type V3 = [number, number, number];
function Box({
  p,
  s,
  c,
  r,
  rough = 0.7,
  metal = 0,
  map,
}: {
  p: V3;
  s: V3;
  c: string;
  r?: V3;
  rough?: number;
  metal?: number;
  map?: THREE.Texture;
}) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} map={map} />
    </mesh>
  );
}
function Glow({
  p,
  s,
  color,
  intensity = 4,
  r,
}: {
  p: V3;
  s: V3;
  color: string;
  intensity?: number;
  r?: V3;
}) {
  // Emissive above 1.0 so Bloom picks it up.
  return (
    <mesh position={p} rotation={r}>
      <boxGeometry args={s} />
      <meshBasicMaterial
        color={new THREE.Color(color).multiplyScalar(intensity)}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ── room ────────────────────────────────────────────── */
function Room() {
  const tex = useMemo(
    () => ({
      floor: floorTexture(),
      back: plasterTexture(C.wall),
      left: plasterTexture(C.wallLeft),
      sky: skyTexture(),
    }),
    [],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0, 6]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} />
      </mesh>
      <mesh position={[6, 6, -2.2]} receiveShadow>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial map={tex.back} roughness={0.95} />
      </mesh>
      <mesh position={[-3.2, 6, 6]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial map={tex.left} roughness={0.95} />
      </mesh>
      <Box p={[6, 0.05, -2.185]} s={[40, 0.1, 0.03]} c={C.cream} />
      <Box p={[-3.185, 0.05, 6]} s={[0.03, 0.1, 40]} c={C.cream} />

      {/* window */}
      <group position={[-3.17, 1.6, -0.75]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial map={tex.sky} toneMapped={false} />
        </mesh>
        {[
          [0, 0.68, 0, 0.06, 1.42],
          [0, -0.68, 0, 0.06, 1.42],
          [0, 0, 0.68, 1.42, 0.06],
          [0, 0, -0.68, 1.42, 0.06],
          [0, 0, 0, 1.36, 0.04],
          [0, 0, 0, 0.04, 1.36],
        ].map(([x, y, z, h, d], i) => (
          <Box key={i} p={[x + 0.02, y, z]} s={[0.06, h, d]} c={C.cream} rough={0.5} />
        ))}
        <Box p={[0.1, -0.72, 0]} s={[0.22, 0.04, 1.55]} c={C.cream} />
      </group>
      {/* curtain: a row of soft folds */}
      <group position={[-3.06, 1.2, 0.1]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[(i % 2) * 0.04, 0, i * 0.075]} castShadow receiveShadow>
            <cylinderGeometry args={[0.05, 0.065, 2.35, 16]} />
            <meshStandardMaterial color={C.curtain} roughness={1} />
          </mesh>
        ))}
        <mesh position={[0.02, 1.2, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 2.2, 10]} />
          <meshStandardMaterial color={C.charcoal} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.25, 0.006, -0.55]} receiveShadow>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial color="#5b3b2e" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.25, 0.007, -0.55]} receiveShadow>
        <ringGeometry args={[1.0, 1.06, 64]} />
        <meshStandardMaterial color="#c99a6b" roughness={1} />
      </mesh>
    </group>
  );
}

function Desk() {
  const wood = useMemo(() => woodTexture(), []);
  return (
    <group>
      <RoundedBox
        args={[2.85, 0.065, 0.98]}
        radius={0.025}
        smoothness={4}
        position={[0.1, 0.758, -1.6]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial map={wood} roughness={0.42} />
      </RoundedBox>
      {/* charcoal body: left pedestal, right drawer unit, back panel */}
      <RoundedBox
        args={[0.5, 0.72, 0.9]}
        radius={0.02}
        position={[-1.0, 0.365, -1.62]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.charcoal} roughness={0.6} />
      </RoundedBox>
      <RoundedBox
        args={[0.62, 0.72, 0.9]}
        radius={0.02}
        position={[1.15, 0.365, -1.62]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.charcoal} roughness={0.6} />
      </RoundedBox>
      {[0.55, 0.32].map((y) => (
        <Box
          key={y}
          p={[1.15, y, -1.165]}
          s={[0.4, 0.012, 0.012]}
          c="#8a8d94"
          metal={0.8}
          rough={0.3}
        />
      ))}
      <Box p={[0.08, 0.42, -2.0]} s={[1.8, 0.6, 0.03]} c={C.charcoal} />
      {/* warm LED under the front lip */}
      <Glow p={[0.1, 0.72, -1.13]} s={[2.0, 0.006, 0.006]} color="#ffb060" intensity={3} />
    </group>
  );
}

function Monitor({ mode, onEnter }: { mode: DeskMode; onEnter: () => void }) {
  const idle = useMemo(() => screenIdleTexture(OS_FOLDERS.map((f) => f.name)), []);
  const glow = useMemo(() => glowTexture("rgba(110,140,255,0.85)"), []);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hover && mode === "desk" ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, mode]);
  const { center: c, width: w, height: h } = SCREEN;
  return (
    <group>
      {/* bias light washing the wall */}
      <mesh position={[c.x, c.y + 0.05, -2.19]}>
        <planeGeometry args={[2.3, 1.5]} />
        <meshBasicMaterial
          map={glow}
          transparent
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* stand */}
      <RoundedBox
        args={[0.34, 0.016, 0.24]}
        radius={0.006}
        position={[c.x, 0.799, -1.86]}
        castShadow
      >
        <meshStandardMaterial color="#b9bcc2" metalness={0.8} roughness={0.3} />
      </RoundedBox>
      <Box p={[c.x, 1.0, -1.9]} s={[0.07, 0.42, 0.03]} c="#b9bcc2" metal={0.8} rough={0.3} />
      {/* body */}
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "desk") onEnter();
        }}
      >
        <RoundedBox
          args={[w + 0.05, h + 0.05, 0.035]}
          radius={0.012}
          position={[c.x, c.y, c.z - 0.02]}
          castShadow
        >
          <meshStandardMaterial color="#121317" roughness={0.35} metalness={0.2} />
        </RoundedBox>
        <mesh position={[c.x, c.y, c.z]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            map={idle}
            toneMapped={false}
            color={new THREE.Color(1, 1, 1).multiplyScalar(hover && mode === "desk" ? 1.35 : 1.1)}
          />
        </mesh>
      </group>
    </group>
  );
}

function Shelf() {
  const wood = useMemo(() => woodTexture("#8d5a39"), []);
  const spines = useMemo(
    () =>
      portfolio.projects
        .map((p, i) => spineTexture(p.name.slice(0, 12), ["#e8913a", "#e9e1d3"][i % 2], "#1d1e22"))
        .concat(
          portfolio.experience
            .slice(0, 2)
            .map((e) => spineTexture(e.company.split(" ")[0], "#2c3148", "#efe7da")),
        ),
    [],
  );
  return (
    <group position={[0.1, 2.02, -2.07]}>
      <RoundedBox args={[1.5, 0.045, 0.24]} radius={0.01} castShadow receiveShadow>
        <meshStandardMaterial map={wood} roughness={0.45} />
      </RoundedBox>
      <Glow p={[0, -0.026, 0.06]} s={[1.4, 0.006, 0.01]} color="#ffb060" intensity={4} />
      {spines.map((tex, i) => {
        const h = 0.24 + ((i * 7) % 4) * 0.015;
        return (
          <mesh
            key={i}
            position={[-0.6 + i * 0.062, 0.022 + h / 2, -0.01]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.055, h, 0.18]} />
            <meshStandardMaterial attach="material-0" color="#e9e1d3" />
            <meshStandardMaterial attach="material-1" color="#e9e1d3" />
            <meshStandardMaterial attach="material-2" color="#e9e1d3" />
            <meshStandardMaterial attach="material-3" color="#e9e1d3" />
            <meshStandardMaterial attach="material-4" map={tex} roughness={0.6} />
            <meshStandardMaterial attach="material-5" map={tex} roughness={0.6} />
          </mesh>
        );
      })}
      {/* amber orb lamp: the OS's "core", in physical form */}
      <mesh position={[0.08, 0.025, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.03, 24]} />
        <meshStandardMaterial color={C.charcoal} />
      </mesh>
      <mesh position={[0.08, 0.11, 0]}>
        <sphereGeometry args={[0.07, 32, 24]} />
        <meshBasicMaterial
          color={new THREE.Color("#ff9a3c").multiplyScalar(2.2)}
          toneMapped={false}
        />
      </mesh>
      <Pot position={[0.38, 0.022, 0]} />
      <Pot position={[0.6, 0.022, 0.01]} small />
    </group>
  );
}

function Pot({ position, small }: { position: V3; small?: boolean }) {
  const s = small ? 0.8 : 1;
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.12, 28]} />
        <meshStandardMaterial color={C.cream} roughness={0.5} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 2.4) * 0.03, 0.17 + (i % 3) * 0.02, Math.sin(i * 2.4) * 0.03]}
          rotation={[Math.sin(i * 2.4) * 0.7, i * 0.7, Math.cos(i * 2.4) * 0.7]}
          scale={[0.032, 0.1, 0.01]}
          castShadow
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={i % 2 ? C.green : "#5fa06f"} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function AcousticPanel({ position }: { position: V3 }) {
  const cells = 4;
  const size = 0.64;
  const step = size / cells;
  return (
    <group position={position}>
      <Box p={[0, 0, 0.01]} s={[size + 0.02, size + 0.02, 0.02]} c={C.foam} rough={1} />
      {Array.from({ length: cells * cells }, (_, i) => {
        const x = -size / 2 + step / 2 + (i % cells) * step;
        const y = -size / 2 + step / 2 + Math.floor(i / cells) * step;
        return (
          <mesh
            key={i}
            position={[x, y, 0.06]}
            rotation={[Math.PI / 2, Math.PI / 4, 0]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[step * 0.7, 0.08, 4]} />
            <meshStandardMaterial color={C.foam} roughness={1} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Speaker({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <RoundedBox
        args={[0.17, 0.28, 0.2]}
        radius={0.02}
        position={[0, 0.14, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.navy} roughness={0.45} />
      </RoundedBox>
      {[
        [0.19, 0.055],
        [0.07, 0.025],
      ].map(([y, r]) => (
        <group key={y} position={[0, y, 0.101]}>
          <mesh>
            <circleGeometry args={[r + 0.008, 32]} />
            <meshStandardMaterial color="#1a1c28" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[r, 32]} />
            <meshStandardMaterial color="#0d0e14" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <circleGeometry args={[r * 0.3, 24]} />
            <meshStandardMaterial color="#4a4f66" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PcTower() {
  return (
    <group position={[1.32, 0.79, -1.68]}>
      <RoundedBox
        args={[0.23, 0.48, 0.44]}
        radius={0.015}
        position={[0, 0.24, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#17181c" roughness={0.35} metalness={0.4} />
      </RoundedBox>
      {/* glass side */}
      <mesh position={[-0.117, 0.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.38, 0.4]} />
        <meshStandardMaterial
          color="#0c1a24"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* front fans */}
      {[0.38, 0.24, 0.1].map((y) => (
        <group key={y} position={[0, y, 0.222]}>
          <mesh>
            <torusGeometry args={[0.055, 0.007, 10, 40]} />
            <meshBasicMaterial
              color={new THREE.Color("#4fb8ff").multiplyScalar(3)}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <circleGeometry args={[0.05, 24]} />
            <meshStandardMaterial color="#0b0c10" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DeskTop() {
  return (
    <group>
      {/* desk mat */}
      <RoundedBox
        args={[1.3, 0.004, 0.42]}
        radius={0.002}
        position={[0.1, 0.792, -1.33]}
        receiveShadow
      >
        <meshStandardMaterial color="#202126" roughness={0.9} />
      </RoundedBox>
      {/* keyboard */}
      <group position={[0.0, 0.806, -1.34]}>
        <RoundedBox args={[0.62, 0.022, 0.19]} radius={0.008} castShadow>
          <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
        </RoundedBox>
        {Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 13 }, (_, col) => (
            <RoundedBox
              key={`${row}-${col}`}
              args={[0.038, 0.012, 0.036]}
              radius={0.004}
              position={[-0.27 + col * 0.045, 0.016, -0.066 + row * 0.044]}
            >
              <meshStandardMaterial
                color={row === 0 && col > 10 ? "#e8913a" : "#f6f3ee"}
                roughness={0.45}
              />
            </RoundedBox>
          )),
        )}
      </group>
      {/* mouse */}
      <mesh position={[0.5, 0.807, -1.32]} scale={[0.04, 0.02, 0.065]} castShadow>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color="#f6f3ee" roughness={0.4} />
      </mesh>
      {/* phone */}
      <RoundedBox
        args={[0.08, 0.008, 0.16]}
        radius={0.004}
        position={[-0.6, 0.796, -1.28]}
        rotation={[0, 0.3, 0]}
        castShadow
      >
        <meshStandardMaterial color="#3d6fd8" roughness={0.3} metalness={0.3} />
      </RoundedBox>
    </group>
  );
}

function Robot({ reducedMotion }: { reducedMotion: boolean }) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame(({ clock }) => {
    if (!body.current || !head.current) return;
    body.current.position.y = reducedMotion ? 0 : Math.sin(clock.getElapsedTime() * 2) * 0.01;
    head.current.rotation.y = THREE.MathUtils.lerp(
      head.current.rotation.y,
      0.5 + pointer.x * 0.6,
      0.08,
    );
    head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -pointer.y * 0.3, 0.08);
  });
  const eye = new THREE.Color("#ffb15c").multiplyScalar(3);
  return (
    <group position={[-1.05, 0.79, -1.32]} rotation={[0, 0.4, 0]}>
      <group ref={body}>
        <RoundedBox args={[0.13, 0.11, 0.1]} radius={0.03} position={[0, 0.07, 0]} castShadow>
          <meshStandardMaterial color={C.cream} roughness={0.35} />
        </RoundedBox>
        <group ref={head} position={[0, 0.18, 0]}>
          <RoundedBox args={[0.17, 0.12, 0.13]} radius={0.035} castShadow>
            <meshStandardMaterial color={C.cream} roughness={0.35} />
          </RoundedBox>
          <RoundedBox args={[0.135, 0.07, 0.02]} radius={0.018} position={[0, 0, 0.06]}>
            <meshStandardMaterial color="#111318" roughness={0.2} />
          </RoundedBox>
          {[-0.03, 0.03].map((x) => (
            <mesh key={x} position={[x, 0, 0.072]}>
              <circleGeometry args={[0.012, 16]} />
              <meshBasicMaterial color={eye} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function Mug({ reducedMotion }: { reducedMotion: boolean }) {
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!steam.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    steam.current.children.forEach((m, i) => {
      const p = (t * 0.35 + i / 3) % 1;
      m.position.y = 0.12 + p * 0.18;
      m.position.x = Math.sin(t * 2 + i) * 0.012;
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - p);
    });
  });
  return (
    <group position={[0.78, 0.79, -1.22]}>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.042, 0.038, 0.1, 32]} />
        <meshStandardMaterial color={C.cream} roughness={0.25} />
      </mesh>
      <mesh position={[0.048, 0.055, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.024, 0.007, 10, 24]} />
        <meshStandardMaterial color={C.cream} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.098, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.037, 24]} />
        <meshStandardMaterial color="#3a2114" roughness={0.2} />
      </mesh>
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Chair() {
  return (
    <group position={[0.3, 0, -0.62]} rotation={[0, 0.4, 0]}>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <Box p={[0.15, 0.065, 0]} s={[0.3, 0.025, 0.04]} c="#9ea1a8" metal={0.7} rough={0.3} />
          <mesh position={[0.29, 0.03, 0]} castShadow>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial color="#1b1c20" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.03, 0.4, 16]} />
        <meshStandardMaterial color="#9ea1a8" metalness={0.8} roughness={0.25} />
      </mesh>
      <RoundedBox
        args={[0.5, 0.08, 0.48]}
        radius={0.035}
        smoothness={4}
        position={[0, 0.5, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.chair} roughness={0.85} />
      </RoundedBox>
      {/* mesh back */}
      <RoundedBox
        args={[0.46, 0.66, 0.05]}
        radius={0.025}
        smoothness={4}
        position={[0, 0.9, 0.24]}
        rotation={[-0.12, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color="#3a3c43" roughness={0.9} />
      </RoundedBox>
      {/* armrests */}
      {[-0.27, 0.27].map((x) => (
        <group key={x}>
          <Box p={[x, 0.62, 0.02]} s={[0.025, 0.22, 0.025]} c="#9ea1a8" metal={0.7} rough={0.3} />
          <RoundedBox args={[0.06, 0.025, 0.24]} radius={0.01} position={[x, 0.74, 0.0]} castShadow>
            <meshStandardMaterial color="#2a2b30" roughness={0.7} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

function FloorPlant() {
  return (
    <group position={[-2.72, 0, -1.75]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.44, 32]} />
        <meshStandardMaterial color={C.cream} roughness={0.5} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.15, 0.82 + (i % 3) * 0.13, Math.sin(a) * 0.15]}
            rotation={[Math.sin(a) * 0.55, a, Math.cos(a) * 0.55]}
            scale={[0.11, 0.4, 0.025]}
            castShadow
          >
            <sphereGeometry args={[1, 14, 12]} />
            <meshStandardMaterial color={i % 2 ? C.green : "#5fa06f"} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
