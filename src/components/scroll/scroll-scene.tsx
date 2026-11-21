"use client";
/* eslint-disable react-hooks/immutability -- Three.js objects are updated imperatively each frame. */
import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { DeviceProfile } from "@/experiences/shared/device";
import { FilmLook, Studio } from "@/experiences/shared/studio";
import { cameraPath, easeInOut } from "@/experiences/shared/timeline";
import { LAST, NODE_COUNT, SHOTS, buildFormations, shapeProgress, weightAt } from "./timeline";

const ICE = new THREE.Color(1.5, 2.1, 2.8); // > 1 so the bloom pass picks it up
const AMBER = new THREE.Color(2.6, 1.6, 0.7);

export default function ScrollScene({
  target,
  device,
}: {
  target: RefObject<number>;
  device: DeviceProfile;
}) {
  return (
    <Canvas
      className="scroll-canvas"
      flat
      dpr={device.lowPower ? [1, 1.5] : [1, 2]}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0, 0.2, 7.5] }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      aria-hidden
    >
      <Studio background="#05060a" envIntensity={0.2} />
      <ambientLight intensity={0.12} />
      <pointLight position={[3, 4, 5]} intensity={28} color="#cfe8ff" />
      <pointLight position={[-4, -2, -3]} intensity={12} color="#f2b36b" />
      <Stage target={target} device={device} />
      <Sparkles
        count={device.lowPower ? 70 : 140}
        scale={[16, 10, 16]}
        size={1.6}
        speed={device.reducedMotion ? 0 : 0.25}
        opacity={0.45}
        color="#bfe3ff"
      />
      <FilmLook lowPower={device.lowPower} bloom={0.9} />
    </Canvas>
  );
}

function Stage({ target, device }: { target: RefObject<number>; device: DeviceProfile }) {
  const forms = useMemo(() => buildFormations(), []);
  const cam = useMemo(() => cameraPath(SHOTS), []);
  const work = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      nodes: Array.from({ length: NODE_COUNT }, () => new THREE.Vector3()),
      line: new Float32Array(forms.pairs.length * 6),
    }),
    [forms],
  );
  const t = useRef(target.current ?? 0);
  const core = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const lineGeo = useRef<THREE.BufferGeometry>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const rings = useRef<THREE.Group>(null);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: ICE, transparent: true, toneMapped: false }),
    [],
  );
  const seats = useRef<THREE.Group>(null);
  const bars = useRef<THREE.Group>(null);
  const still = device.reducedMotion;

  useFrame((state, dt) => {
    // Ease towards the scrolled position (inertia without a scroll-jacking library).
    const goal = THREE.MathUtils.clamp(shapeProgress(target.current ?? 0), 0, LAST);
    t.current = still ? goal : THREE.MathUtils.damp(t.current, goal, 3.2, Math.min(dt, 0.1));
    const tt = t.current;
    const time = state.clock.elapsedTime;

    // Camera, with a little pointer parallax on desktop.
    cam.sample(tt, work.pos, work.look);
    if (!still && !device.touch) {
      work.pos.x += state.pointer.x * 0.3;
      work.pos.y += state.pointer.y * 0.2;
    }
    state.camera.position.copy(work.pos);
    state.camera.lookAt(work.look);

    // Nodes morph between the two formations either side of `tt`.
    const a = Math.min(Math.floor(tt), LAST);
    const b = Math.min(a + 1, LAST);
    const u = easeInOut(tt - a);
    const fa = forms.byChapter[a];
    const fb = forms.byChapter[b];
    for (let i = 0; i < NODE_COUNT; i++) {
      const p = work.nodes[i].lerpVectors(fa[i], fb[i], u);
      const s = 0.045 + 0.02 * Math.sin(time * 1.3 + i);
      work.m.makeScale(s, s, s).setPosition(p);
      nodes.current?.setMatrixAt(i, work.m);
    }
    if (nodes.current) nodes.current.instanceMatrix.needsUpdate = true;

    forms.pairs.forEach(([i, j], k) => {
      work.nodes[i].toArray(work.line, k * 6);
      work.nodes[j].toArray(work.line, k * 6 + 3);
    });
    const attr = lineGeo.current?.getAttribute("position");
    if (attr) attr.needsUpdate = true;
    // Links read as a solid "core" when assembled and thin out as it explodes.
    // Links stretch across clusters in the principles chapter, so hide them there.
    if (lineMat.current)
      lineMat.current.opacity = (0.12 + 0.3 * (1 - weightAt(tt, 1))) * (1 - weightAt(tt, 4));

    if (core.current && !still) core.current.rotation.y = time * 0.07;

    // Experience: three orbits, one per published role.
    const wr = weightAt(tt, 2);
    if (rings.current) {
      rings.current.visible = wr > 0.01;
      rings.current.scale.setScalar(0.6 + 0.4 * wr);
      rings.current.children.forEach((r, i) => {
        if (!still) r.rotation.z = time * (0.12 + i * 0.05);
      });
    }
    ringMat.opacity = wr;

    // Projects: an abstract seat map (SeatPeekr) and a spend chart (Finance Tracker).
    const wp = weightAt(tt, 3);
    for (const g of [seats.current, bars.current]) {
      if (!g) continue;
      g.visible = wp > 0.01;
      g.position.y = -0.6 * (1 - wp);
      g.scale.setScalar(Math.max(0.001, wp));
    }
  });

  return (
    <>
      <group ref={core}>
        <instancedMesh ref={nodes} args={[undefined, undefined, NODE_COUNT]} frustumCulled={false}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#ffffff" emissive={ICE} emissiveIntensity={1.4} />
        </instancedMesh>
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={lineGeo}>
            <bufferAttribute attach="attributes-position" args={[work.line, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            ref={lineMat}
            color={ICE}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </lineSegments>
      </group>

      <group ref={rings}>
        {[2.1, 2.65, 3.2].map((r, i) => (
          <group key={r} rotation={[Math.PI / 2 - 0.35 + i * 0.22, i * 0.4, 0]}>
            <mesh material={ringMat}>
              <torusGeometry args={[r, 0.01, 8, 160]} />
            </mesh>
            <mesh position={[r, 0, 0]}>
              <sphereGeometry args={[0.07, 16, 12]} />
              <meshBasicMaterial color={AMBER} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={seats} position={[-1.9, 0, 2.6]} rotation={[0.35, 0.25, 0]}>
        {Array.from({ length: 35 }, (_, i) => {
          const row = Math.floor(i / 7);
          const col = i % 7;
          const picked = row === 2 && col === 3;
          return (
            <mesh key={i} position={[(col - 3) * 0.22, (2 - row) * 0.2, row * 0.06]}>
              <boxGeometry args={[0.15, 0.12, 0.12]} />
              <meshStandardMaterial
                color={picked ? "#f2b36b" : "#2a3442"}
                emissive={picked ? AMBER : "#000000"}
                emissiveIntensity={picked ? 1 : 0}
              />
            </mesh>
          );
        })}
        <mesh position={[0, 0.75, -0.3]}>
          <planeGeometry args={[1.7, 0.08]} />
          <meshBasicMaterial color={ICE} toneMapped={false} />
        </mesh>
      </group>

      <group ref={bars} position={[1.9, -0.45, 2.6]} rotation={[0.2, -0.25, 0]}>
        {[0.45, 0.8, 0.35, 1.1, 0.6, 0.9, 0.5].map((h, i) => (
          <mesh key={i} position={[(i - 3) * 0.22, h / 2, 0]}>
            <boxGeometry args={[0.14, h, 0.14]} />
            <meshStandardMaterial
              color={i === 3 ? "#f2b36b" : "#9fc9e8"}
              emissive={i === 3 ? AMBER : "#000000"}
              emissiveIntensity={i === 3 ? 0.8 : 0}
              metalness={0.2}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
