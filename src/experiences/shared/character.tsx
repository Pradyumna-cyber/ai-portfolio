"use client";
/* eslint-disable react-hooks/immutability, react-hooks/refs -- joint groups are collected by ref callbacks (run at commit, not render) and rotated imperatively every frame, by design. */
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import { evaluateDrive, JOINTS, type CharacterDrive, type Joint } from "./motion";

/** Attachment points a scenario can read (e.g. to put a headset in the hand, then on the head). */
export type CharacterAnchors = { hand: THREE.Object3D | null; face: THREE.Object3D | null };

/**
 * Stand-in character: a stylised, fully jointed figure (1.76 m) animated by the clips in
 * motion.ts. It deliberately has the same interface a rigged .glb avatar would need:
 * a root transform (ref), a per-frame `drive`, and hand/face anchors.
 */
export function Character({
  ref,
  drive,
  anchors,
  palette = DEFAULT_PALETTE,
}: {
  ref?: Ref<THREE.Group>;
  drive: RefObject<CharacterDrive>;
  anchors?: RefObject<CharacterAnchors>;
  palette?: Palette;
}) {
  const joints = useRef<Partial<Record<Joint, THREE.Group | null>>>({});
  const hips = useRef<THREE.Group>(null);
  const bind = (j: Joint) => (el: THREE.Group | null) => {
    joints.current[j] = el;
  };

  useFrame(() => {
    const pose = evaluateDrive(drive.current);
    if (hips.current) hips.current.position.set(0, HIP_HEIGHT + pose.hipsY, pose.hipsZ);
    for (const j of JOINTS) {
      const g = joints.current[j];
      if (g) g.rotation.set(pose.rot[j][0], pose.rot[j][1], pose.rot[j][2]);
    }
  });

  const m = useMaterials(palette);

  return (
    <group ref={ref}>
      <group ref={hips} position={[0, HIP_HEIGHT, 0]}>
        <group ref={bind("pelvis")}>
          {/* pelvis */}
          <RoundedBox
            args={[0.31, 0.16, 0.2]}
            radius={0.06}
            position={[0, -0.02, 0]}
            castShadow
            material={m.pants}
          />

          {/* legs */}
          {(["L", "R"] as const).map((side) => {
            const x = side === "L" ? 0.095 : -0.095;
            return (
              <group key={side} ref={bind(`thigh${side}`)} position={[x, -0.05, 0]}>
                <Limb length={0.42} radius={0.078} material={m.pants} />
                <group ref={bind(`knee${side}`)} position={[0, -0.42, 0]}>
                  <Limb length={0.41} radius={0.06} material={m.pants} />
                  <group ref={bind(`ankle${side}`)} position={[0, -0.41, 0]}>
                    <RoundedBox
                      args={[0.1, 0.075, 0.26]}
                      radius={0.03}
                      position={[0, -0.04, 0.055]}
                      castShadow
                      material={m.shoes}
                    />
                    <mesh
                      position={[0, -0.077, 0.055]}
                      rotation={[-Math.PI / 2, 0, 0]}
                      material={m.sole}
                    >
                      <planeGeometry args={[0.1, 0.26]} />
                    </mesh>
                  </group>
                </group>
              </group>
            );
          })}

          {/* torso */}
          <group ref={bind("spine")} position={[0, 0.07, 0]}>
            <mesh position={[0, 0.1, 0]} castShadow material={m.top}>
              <capsuleGeometry args={[0.135, 0.08, 6, 16]} />
            </mesh>
            <group ref={bind("chest")} position={[0, 0.17, 0]}>
              <RoundedBox
                args={[0.4, 0.34, 0.23]}
                radius={0.09}
                smoothness={4}
                position={[0, 0.16, 0]}
                castShadow
                material={m.top}
              />
              {/* hood bunched behind the neck */}
              <mesh position={[0, 0.33, -0.08]} rotation={[0.3, 0, 0]} castShadow material={m.top}>
                <torusGeometry args={[0.1, 0.04, 10, 24, Math.PI]} />
              </mesh>
              {/* arms */}
              {(["L", "R"] as const).map((side) => {
                const x = side === "L" ? 0.225 : -0.225;
                return (
                  <group key={side} ref={bind(`shoulder${side}`)} position={[x, 0.27, 0]}>
                    <Limb length={0.29} radius={0.058} material={m.top} />
                    <group ref={bind(`elbow${side}`)} position={[0, -0.29, 0]}>
                      <Limb length={0.25} radius={0.047} material={m.top} />
                      <group position={[0, -0.28, 0]}>
                        <RoundedBox
                          args={[0.075, 0.1, 0.035]}
                          radius={0.017}
                          castShadow
                          material={m.skin}
                        />
                        {side === "R" && (
                          <group
                            position={[0, -0.03, 0.04]}
                            ref={(el) => {
                              if (anchors) anchors.current.hand = el;
                            }}
                          />
                        )}
                      </group>
                    </group>
                  </group>
                );
              })}
              {/* neck + head */}
              <group ref={bind("neck")} position={[0, 0.33, 0]}>
                <mesh position={[0, 0.04, 0]} castShadow material={m.skin}>
                  <cylinderGeometry args={[0.048, 0.055, 0.09, 16]} />
                </mesh>
                <group ref={bind("head")} position={[0, 0.1, 0]}>
                  <mesh
                    position={[0, 0.1, 0.005]}
                    scale={[0.1, 0.122, 0.112]}
                    castShadow
                    material={m.skin}
                  >
                    <sphereGeometry args={[1, 32, 24]} />
                  </mesh>
                  {/* hair */}
                  <mesh
                    position={[0, 0.145, -0.012]}
                    scale={[0.106, 0.095, 0.112]}
                    castShadow
                    material={m.hair}
                  >
                    <sphereGeometry args={[1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                  </mesh>
                  {/* ears + nose give the head a readable front */}
                  {[0.098, -0.098].map((ex) => (
                    <mesh
                      key={ex}
                      position={[ex, 0.095, 0]}
                      scale={[0.018, 0.03, 0.022]}
                      material={m.skin}
                    >
                      <sphereGeometry args={[1, 12, 10]} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.085, 0.112]} scale={[0.016, 0.024, 0.02]} material={m.skin}>
                    <sphereGeometry args={[1, 12, 10]} />
                  </mesh>
                  {/* eye level, just in front of the face (where a headset or glasses sit) */}
                  <group
                    position={[0, 0.095, 0.1]}
                    ref={(el) => {
                      if (anchors) anchors.current.face = el;
                    }}
                  />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Height of the hip joint above the feet when standing. */
const HIP_HEIGHT = 0.955;

function Limb({
  length,
  radius,
  material,
}: {
  length: number;
  radius: number;
  material: THREE.Material;
}) {
  return (
    <mesh position={[0, -length / 2, 0]} castShadow material={material}>
      <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 6, 16]} />
    </mesh>
  );
}

export type Palette = { skin: string; hair: string; top: string; pants: string; shoes: string };
export const DEFAULT_PALETTE: Palette = {
  skin: "#b07c5c",
  hair: "#1c1613",
  top: "#2e3a4f",
  pants: "#23262c",
  shoes: "#ecebe7",
};

function useMaterials(p: Palette) {
  return useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.55 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.8 }),
      top: new THREE.MeshStandardMaterial({ color: p.top, roughness: 0.85 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.8 }),
      shoes: new THREE.MeshStandardMaterial({ color: p.shoes, roughness: 0.5 }),
      sole: new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.9 }),
    }),
    [p],
  );
}
