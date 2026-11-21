"use client";
/* eslint-disable react-hooks/immutability -- materials and transforms are animated imperatively each frame. */
import { Text, useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { buildHairShells, shellMaterial, strandTexture } from "./hair";

/**
 * Leaner, more defined face: narrows the lower face and jaw, carves soft hollows under the
 * cheekbones, sharpens the chin and slims the neck. Works in head-local units (eye line
 * ≈ 0.06, nose tip ≈ −0.14, mouth ≈ −0.31, chin ≈ −0.55; face looks +Z).
 */
function sculptLean(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute("position");
  const ss = THREE.MathUtils.smoothstep;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const front = ss(z, -0.2, 0.12);
    // 1. Lower face narrows from the cheekbones down to the jaw.
    const lower = ss(-y, 0.0, 0.42);
    x *= 1 - 0.14 * lower * front;
    // 2. Hollows under the cheekbones (between cheekbone and mouth corners).
    const band = ss(-y, -0.02, -0.1 + 0.18) * (1 - ss(-y, 0.24, 0.36));
    const side = ss(Math.abs(x), 0.14, 0.26);
    const hollow = band * side * ss(z, 0.0, 0.2);
    x -= Math.sign(x) * 0.022 * hollow;
    z -= 0.012 * hollow;
    // 3. Jawline: pull the soft area under the jaw up and in, so the jaw reads as an edge.
    const underJaw = ss(-y, 0.38, 0.55) * (1 - ss(-y, 0.62, 0.72)) * ss(z, -0.05, 0.25);
    z -= 0.04 * underJaw * (1 - ss(Math.abs(x), 0, 0.12) * 0.5);
    // 4. Neck: slimmer and slightly set back under the jaw.
    const neck = ss(-y, 0.5, 0.62);
    x *= 1 - 0.12 * neck;
    z = z * (1 - 0.1 * neck) - 0.015 * neck;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Soft radial falloff for the light behind the glass. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 70, 4, 128, 70, 120);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}

/** Futuro-style palette: deep blue key light, orange glow from the visor. */
const BLUE = new THREE.Color("#2f6bff");
const ORANGE_TEXT = new THREE.Color(1.15, 0.36, 0.04);
/** x where "AI" ends and "INFUSED" begins, so the pair is centred (≈ 0.54 units per glyph). */
const SPLIT = -1.02;
const WHITE_TEXT = new THREE.Color(1.7, 1.7, 1.75);

/**
 * Landmarks measured from the scan's vertices (its own units): crown y 3.97, nose tip
 * y 1.10 / z 2.59, chin ≈ y −0.6; shoulders below y −1.5. We scale crown→chin to
 * HEAD_HEIGHT and put the head centre at the origin.
 */
const SCAN = { crown: 3.97, chin: -0.6, centerZ: 0.2 };
const HEAD_HEIGHT = 1.1;
const S = HEAD_HEIGHT / (SCAN.crown - SCAN.chin);
const toLocalY = (y: number) => (y - (SCAN.crown + SCAN.chin) / 2) * S;
/** Eye line and face front in local units. */
export const EYE_Y = toLocalY(1.95);
const FACE_Z = (2.5 - SCAN.centerZ) * S;
/** Everything of the scan below this height (its bare shoulders) is clipped away. */
const NECK_CUT = toLocalY(-1.15);
/** Jacket: collar base height and front-to-back squash of the torso. */
const COLLAR_Y = NECK_CUT + 0.02;
const JACKET_X = 1.28;
const JACKET_Z = 0.72;

const HEAD_URL = "/models/head/LeePerrySmith.glb";
useGLTF.preload(HEAD_URL);

/**
 * Act 1: a scanned head wearing a glossy VR headset, lit like a product shot, with the
 * name set in giant pixel type behind it. Head centre is the origin; the face looks +Z.
 */
export function Bust({ t, still }: { t: RefObject<number>; still: boolean }) {
  const { nodes } = useGLTF(HEAD_URL) as unknown as {
    nodes: { LeePerrySmith: THREE.Mesh };
  };
  const [skinMap, skinNormal] = useTexture([
    "/models/head/Map-COL.jpg",
    "/models/head/Infinite-Level_02_Tangent_SmoothUV.jpg",
  ]);

  const head = useMemo(() => {
    const geo = nodes.LeePerrySmith.geometry.clone();
    geo.translate(0, -(SCAN.crown + SCAN.chin) / 2, -SCAN.centerZ);
    geo.scale(S, S, S);
    sculptLean(geo);
    return geo;
  }, [nodes]);

  const m = useMemo(() => {
    skinMap.colorSpace = THREE.SRGBColorSpace;
    return {
      skin: new THREE.MeshPhysicalMaterial({
        map: skinMap,
        normalMap: skinNormal,
        normalScale: new THREE.Vector2(0.9, 0.9),
        color: "#2a2220",
        roughness: 0.52,
        sheen: 0,
        sheenColor: new THREE.Color("#ff9a5c"),
        envMapIntensity: 0.08,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -NECK_CUT)],
      }),
      // Technical shell jacket: near-black, with a cool sheen that only shows on the rim light.
      jacket: new THREE.MeshPhysicalMaterial({
        color: "#060709",
        roughness: 0.78,
        sheen: 0.45,
        sheenColor: new THREE.Color("#33405f"),
        sheenRoughness: 0.45,
        envMapIntensity: 0.15,
        side: THREE.DoubleSide,
      }),
      // Vision Pro–style headset: one piece of curved black glass in an aluminium frame.
      glass: new THREE.MeshPhysicalMaterial({
        color: "#020203",
        roughness: 0.02,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.01,
        envMapIntensity: 0.05,
        // Slightly see-through, so the dim light behind the black glass shows.
        transparent: true,
        opacity: 0.94,
      }),
      glow: new THREE.MeshBasicMaterial({
        map: glowTexture(),
        color: new THREE.Color(0.22, 0.3, 1.25),
        transparent: true,
        opacity: 0.22,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      aluminium: new THREE.MeshPhysicalMaterial({
        color: "#b9bec6",
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 0.9,
      }),
      seal: new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 1 }),
      zip: new THREE.MeshStandardMaterial({ color: "#2a2d33", metalness: 0.8, roughness: 0.4 }),
      knit: new THREE.MeshStandardMaterial({ color: "#34373d", roughness: 1 }),
    };
  }, [skinMap, skinNormal]);

  /** Jacket body profile (radius, height below the collar base), revolved into the torso. */
  const jacket = useMemo(() => {
    const profile: [number, number][] = [
      [0.26, 0.04],
      [0.33, -0.03],
      [0.56, -0.12],
      [0.8, -0.25],
      [0.92, -0.45],
      [0.95, -0.8],
      [0.93, -1.5],
    ];
    const body = new THREE.LatheGeometry(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      96,
    );
    // Zipper runs down the centre front, following the chest surface.
    const radiusAt = (y: number) => {
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, y0] = profile[i];
        const [r1, y1] = profile[i + 1];
        if (y <= y0 && y >= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return profile[profile.length - 1][0];
    };
    const zip = new THREE.CatmullRomCurve3(
      [-0.02, -0.12, -0.25, -0.45, -0.8, -1.3].map(
        (y) => new THREE.Vector3(0, y, radiusAt(y) * JACKET_Z + 0.006),
      ),
    );
    return { body, zip: new THREE.TubeGeometry(zip, 64, 0.008, 6, false) };
  }, []);

  const hair = useMemo(() => {
    const strands = strandTexture();
    const shells = buildHairShells(head);
    return shells.map((geometry, i) => ({ geometry, material: shellMaterial(i, strands) }));
  }, [head]);

  const glassTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, EYE_Y, FACE_Z + 0.1);
    return o;
  }, []);
  const headGroup = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    // Only the headset should reflect the studio. three.js ignores a material's
    // envMapIntensity unless it has its own envMap, so hand the scene's map to the glass
    // and aluminium; everything else gets the (near-zero) scene-wide environment.
    const env = state.scene.environment;
    if (env && m.glass.envMap !== env) {
      for (const mat of [m.glass, m.aluminium]) {
        mat.envMap = env;
        mat.needsUpdate = true;
      }
    }
    const tt = t.current ?? 0;
    const time = still ? 0 : state.clock.elapsedTime;
    // The inside of the visor lights up as the camera closes in.
    const dive = THREE.MathUtils.smoothstep(tt, 0.3, 1.0);
    // A faint light lives behind the black glass; it floods the view as we dive in.
    m.glow.opacity = 0.2 + 0.05 * Math.sin(time * 1.3) + 0.8 * dive;
    // Fade the studio reflections up close so the inner light, not the room, fills the view.
    m.glass.envMapIntensity = 0.05 * (1 - dive) + 0.01;
    m.glass.opacity = 0.94 - 0.8 * dive;
    m.glass.clearcoat = 1 - dive;
    m.aluminium.envMapIntensity = 0.9 * (1 - dive) + 0.05;
    // No spill onto the face at rest (silhouette); it only lights up during the dive.
    if (glow.current) glow.current.intensity = 5 * dive * dive;
    if (headGroup.current) {
      const calm = 1 - dive;
      headGroup.current.rotation.y = Math.sin(time * 0.3) * 0.07 * calm;
      headGroup.current.rotation.x = Math.sin(time * 0.23) * 0.025 * calm;
    }
  });

  // Narrow (phone) screens: shrink the name so it stays inside the frame.
  const aspect = useThree((st) => st.size.width / st.size.height);
  const nameScale = Math.min(1, aspect / 1.5);
  // Portrait framing sits closer to the head, so lift the phrase clear of the hair.
  const phraseLift = aspect < 1 ? (1 - aspect) * 0.42 : 0;
  // Headset parts are bands of spheres (curved both ways, like the real front glass).
  const band = (
    r: number,
    arc: number,
    half: number,
  ): [number, number, number, number, number, number, number] => [
    r,
    72,
    28,
    Math.PI / 2 - arc / 2,
    arc,
    Math.PI / 2 - half,
    half * 2,
  ];

  return (
    <group>
      {/* Low-key lighting: face and jacket fall into shadow; rims trace the silhouette and a
          narrow top light makes the glass front the brightest thing in frame. */}
      <ambientLight intensity={0.02} color="#1b2a66" />
      <spotLight position={[-1.6, 2.6, 2.2]} angle={0.3} penumbra={1} intensity={0} color={BLUE} />
      <spotLight
        position={[2.4, 1.2, -1.8]}
        angle={0.7}
        penumbra={1}
        intensity={34}
        color="#3d7bff"
      />
      <spotLight
        position={[-2.6, 0.4, -1.6]}
        angle={0.7}
        penumbra={1}
        intensity={22}
        color="#5b8cff"
      />
      {/* Glass highlight: aimed at the visor front from a low angle so it never grazes the hair. */}
      <primitive object={glassTarget} />
      <spotLight
        target={glassTarget}
        position={[0.3, 0.75, 3.2]}
        angle={0.07}
        penumbra={0.6}
        intensity={36}
        color="#ffffff"
      />
      <pointLight
        ref={glow}
        position={[0, EYE_Y - 0.22, FACE_Z + 0.32]}
        distance={1.6}
        decay={2}
        color="#6f7cff"
      />

      {/* Phrase behind the head, in pixel type; set high enough that the crown never covers a letter. */}
      <group position={[0, 0.74 + phraseLift, -1.8]} scale={nameScale}>
        {/* "AI" (orange) + "INFUSED" (white), centred as one line; split at SPLIT. */}
        <Text
          font="/fonts/Silkscreen-Bold.ttf"
          fontSize={0.52}
          letterSpacing={-0.02}
          anchorX="right"
          anchorY="bottom"
          position={[SPLIT - 0.12, 0, 0]}
          color={ORANGE_TEXT}
          material-toneMapped={false}
        >
          AI
        </Text>
        <Text
          font="/fonts/Silkscreen-Bold.ttf"
          fontSize={0.52}
          letterSpacing={-0.02}
          anchorX="left"
          anchorY="bottom"
          position={[SPLIT + 0.12, 0, 0]}
          color={WHITE_TEXT}
          material-toneMapped={false}
        >
          INFUSED
        </Text>
      </group>

      <group ref={headGroup}>
        <mesh geometry={head} material={m.skin} />
        {hair.map((h, i) => (
          <mesh key={i} geometry={h.geometry} material={h.material} renderOrder={i} />
        ))}

        {/* headset: black glass front, aluminium frame, light seal, knit band, audio pods */}
        <group position={[0, EYE_Y, FACE_Z - 0.4]}>
          <mesh material={m.seal}>
            <sphereGeometry args={band(0.47, 2.4, 0.3)} />
          </mesh>
          <mesh material={m.aluminium}>
            <sphereGeometry args={band(0.505, 2.36, 0.37)} />
          </mesh>
          <mesh material={m.glow}>
            <sphereGeometry args={band(0.522, 2.18, 0.31)} />
          </mesh>
          <mesh material={m.glass}>
            <sphereGeometry args={band(0.53, 2.26, 0.335)} />
          </mesh>
          <group position={[0, 0, -(FACE_Z - 0.4)]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.98, 1.08, 1]} material={m.knit}>
              <torusGeometry args={[0.46, 0.05, 16, 72]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh
                key={sx}
                position={[sx * 0.45, -0.07, 0.02]}
                rotation={[0, 0, 0.12 * sx]}
                material={m.aluminium}
              >
                <capsuleGeometry args={[0.022, 0.09, 6, 12]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* Jacket: stand-up collar open at the front, rolled collar edge, zipper, broad shoulders.
          The scan's bare shoulders are clipped away below NECK_CUT. */}
      <group position={[0, COLLAR_Y, -0.06]}>
        <mesh material={m.jacket} position={[0, 0.15, 0]} scale={[1, 1, 0.95]}>
          <cylinderGeometry args={[0.29, 0.34, 0.32, 64, 1, true, 0.32, Math.PI * 2 - 0.64]} />
        </mesh>
        <mesh
          material={m.jacket}
          position={[0, 0.31, 0]}
          rotation={[Math.PI / 2, 0, Math.PI / 2 + 0.32]}
          scale={[1, 0.95, 1]}
        >
          <torusGeometry args={[0.29, 0.022, 10, 64, Math.PI * 2 - 0.64]} />
        </mesh>
        <mesh geometry={jacket.body} material={m.jacket} scale={[JACKET_X, 1, JACKET_Z]} />
        <mesh geometry={jacket.zip} material={m.zip} />
        <mesh position={[0, 0.02, 0.27]} material={m.zip}>
          <boxGeometry args={[0.028, 0.06, 0.012]} />
        </mesh>
      </group>
    </group>
  );
}
