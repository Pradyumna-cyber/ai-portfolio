"use client";
/* eslint-disable react-hooks/immutability -- materials and transforms are animated imperatively each frame. */
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { lerpAngle } from "@/experiences/shared/timeline";
import {
  CHAPTERS,
  CITIES,
  EARTH_R,
  HOME,
  ROUTES,
  arcPoints,
  latLon,
  subsolarPoint,
  weightAt,
} from "./timeline";

/** Chapter index by name, so props stay tied to the right section if chapters change. */
const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c, i])) as Record<
  (typeof CHAPTERS)[number],
  number
>;

const ORANGE = new THREE.Color(3, 1.3, 0.35);
const ICE = new THREE.Color(1.3, 1.6, 2.4);

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

/** Day/night blend from the real sun direction: lit continents, city lights on the night side, ocean glint. */
const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uSpec;
  uniform vec3 uSun;
  varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    vec3 L = normalize(uSun);
    float d = dot(N, L);
    float day = smoothstep(-0.12, 0.22, d);
    vec3 dayCol = texture2D(uDay, vUv).rgb * (0.06 + 1.3 * max(d, 0.0));
    vec3 lights = pow(texture2D(uNight, vUv).rgb, vec3(1.35)) * vec3(1.0, 0.7, 0.4) * 3.4;
    float spec = texture2D(uSpec, vUv).r;
    float glint = pow(max(dot(N, normalize(L + V)), 0.0), 140.0) * spec * day * 0.55;
    vec3 col = mix(lights, dayCol, day) + vec3(1.0, 0.92, 0.78) * glint;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += vec3(0.22, 0.48, 1.0) * fres * (0.12 + 0.9 * smoothstep(-0.3, 0.4, d));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

/**
 * Arc tube shader (GitHub-globe style): a faint full route plus a bright comet whose tail
 * fades behind its head. uv.x runs 0 → 1 along the tube.
 */
const ARC_VERT = /* glsl */ `
  varying float vT;
  void main() {
    vT = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const ARC_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uHead; uniform float uLen; uniform float uBase; uniform float uGain;
  varying float vT;
  void main() {
    float d = uHead - vT;
    float tail = (d >= 0.0 && d <= uLen) ? pow(1.0 - d / uLen, 2.4) : 0.0;
    float a = (uBase + tail) * uGain;
    gl_FragColor = vec4(uColor * (0.5 + 1.8 * tail), a);
  }`;
const COMET_LEN = 0.32;

const ATMOS_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vPos;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
/** Atmospheric halo, brighter on the sunlit limb. */
const ATMOS_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vN; varying vec3 vPos;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    // Back faces: dot(N, V) is 0 at the halo's outer edge and grows towards the planet's limb.
    float rim = pow(smoothstep(0.0, 0.55, -dot(N, V)), 1.6);
    float lit = 0.2 + 0.8 * smoothstep(-0.4, 0.5, dot(N, normalize(uSun)));
    float a = rim * lit * 0.85;
    gl_FragColor = vec4(vec3(0.3, 0.58, 1.0) * a * 1.6, a);
  }`;

/**
 * Act 2: a photoreal Earth lit by the real sun for the current moment (day side over India
 * in Indian daytime, city lights at night), clouds, atmosphere, and a live-looking network:
 * arcs between real hubs with data packets travelling along them.
 */
export function Earth({
  t,
  still,
  lowPower,
}: {
  t: RefObject<number>;
  still: boolean;
  lowPower: boolean;
}) {
  const [day, night, spec, clouds] = useTexture([
    "/textures/earth/day.jpg",
    "/textures/earth/night.jpg",
    "/textures/earth/specular.jpg",
    "/textures/earth/clouds.jpg",
  ]);

  const m = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    for (const tex of [day, night, spec, clouds]) tex.anisotropy = 8;
    const sun = new THREE.Vector3(1, 0, 0);
    return {
      sun,
      earth: new THREE.ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
        uniforms: {
          uDay: { value: day },
          uNight: { value: night },
          uSpec: { value: spec },
          uSun: { value: sun },
        },
      }),
      atmos: new THREE.ShaderMaterial({
        vertexShader: ATMOS_VERT,
        fragmentShader: ATMOS_FRAG,
        uniforms: { uSun: { value: sun } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
      clouds: new THREE.MeshStandardMaterial({
        alphaMap: clouds,
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        roughness: 1,
      }),
      head: new THREE.MeshBasicMaterial({ toneMapped: false }),
      city: new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.6, 1.6, 1.8),
        toneMapped: false,
      }),
      beacon: new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, toneMapped: false }),
      orbit: new THREE.MeshBasicMaterial({ color: ICE, transparent: true, toneMapped: false }),
      node: new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, toneMapped: false }),
      hud: new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.14 }),
    };
  }, [day, night, spec, clouds]);

  // Sun direction in Earth-local space for *now*, refreshed every minute.
  const sunLocal = useRef(new THREE.Vector3(1, 0, 0));
  useEffect(() => {
    const update = () => {
      const p = subsolarPoint(new Date());
      latLon(p.lat, p.lon, 1, sunLocal.current);
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const routes = useMemo(
    () =>
      ROUTES.map(([a, b], i) => {
        const pts = arcPoints(
          latLon(CITIES[a].lat, CITIES[a].lon, EARTH_R),
          latLon(CITIES[b].lat, CITIES[b].lon, EARTH_R),
          80,
        );
        const home = a === "thane" || b === "thane";
        const curve = new THREE.CatmullRomCurve3(pts);
        const material = new THREE.ShaderMaterial({
          vertexShader: ARC_VERT,
          fragmentShader: ARC_FRAG,
          uniforms: {
            uColor: { value: home ? ORANGE : ICE },
            uHead: { value: -1 },
            uLen: { value: COMET_LEN },
            uBase: { value: home ? 0.16 : 0.08 },
            uGain: { value: 1 },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 96, home ? 0.006 : 0.0045, 6, false),
          material,
        );
        // Stagger launches; Thane's routes fire more often.
        return { curve, home, tube, material, speed: home ? 0.34 : 0.24, offset: i * 0.37 };
      }),
    [],
  );
  const headsRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = headsRef.current;
    if (!mesh) return;
    routes.forEach((r, i) => mesh.setColorAt(i, r.home ? ORANGE : ICE));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [routes]);

  /** City markers: a bright dot plus a ring that pulses outward, each on its own phase. */
  const cities = useMemo(
    () =>
      Object.entries(CITIES)
        .filter(([k]) => k !== "thane")
        .map(([, c], i) => {
          const p = latLon(c.lat, c.lon, EARTH_R * 1.003);
          return {
            p,
            q: new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              p.clone().normalize(),
            ),
            ring: new THREE.MeshBasicMaterial({
              color: ICE,
              transparent: true,
              toneMapped: false,
              depthWrite: false,
              side: THREE.DoubleSide,
            }),
            phase: i * 0.23,
          };
        }),
    [],
  );
  const cityRings = useRef<(THREE.Mesh | null)[]>([]);

  const home = useMemo(() => latLon(HOME.lat, HOME.lon, EARTH_R), []);
  const beaconQuat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        home.clone().normalize(),
      ),
    [home],
  );
  /** Spin angle that turns Thane towards the camera (+Z). */
  const homeFacing = useMemo(() => {
    const theta = ((HOME.lon + 180) / 360) * Math.PI * 2;
    return Math.atan2(Math.cos(theta), Math.sin(theta));
  }, []);
  const ringTicks = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const r0 = EARTH_R * 1.55;
      const r1 = r0 + (i % 15 === 0 ? 0.14 : 0.05);
      pts.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1);
    }
    return new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pts, 3),
    );
  }, []);

  const spin = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const orbits = useRef<THREE.Group>(null);
  const beliefs = useRef<THREE.Group>(null);
  const hud = useRef<THREE.Group>(null);
  const angle = useRef(homeFacing - 0.9);
  const tmp = useMemo(
    () => ({ q: new THREE.Quaternion(), m: new THREE.Matrix4(), p: new THREE.Vector3() }),
    [],
  );

  useFrame((state, dt) => {
    const tt = t.current ?? 0;
    const time = still ? 0 : state.clock.elapsedTime;
    const step = Math.min(dt, 0.1);

    // Slow spin; on the contact chapter Thane turns to face the viewer.
    if (!still) angle.current += step * 0.05;
    const face = weightAt(tt, CH.contact);
    if (spin.current) {
      spin.current.rotation.y = lerpAngle(angle.current, homeFacing, face);
      // Sun stays fixed to geography (it is a moment in time), so rotate it with the planet.
      spin.current.getWorldQuaternion(tmp.q);
      m.sun.copy(sunLocal.current).applyQuaternion(tmp.q);
      sunLight.current?.position.copy(m.sun).multiplyScalar(20);
    }
    if (cloudMesh.current && !still) cloudMesh.current.rotation.y = time * 0.004;

    // Network: comets launch along each route; everything brightens on the projects chapter.
    const wp = Math.max(weightAt(tt, CH.projects), weightAt(tt, CH.build));
    const heads = headsRef.current;
    routes.forEach((r, i) => {
      const cycle = 1 + COMET_LEN + 0.5; // travel, tail drains, short pause
      const h = still ? 0.6 : (time * r.speed + r.offset) % cycle;
      r.material.uniforms.uHead.value = h;
      r.material.uniforms.uGain.value = 0.75 + 0.6 * wp;
      if (heads) {
        const visible = h <= 1;
        r.curve.getPointAt(Math.min(h, 1), tmp.p);
        const sz = visible ? (r.home ? 0.022 : 0.016) : 0;
        tmp.m.makeScale(sz, sz, sz).setPosition(tmp.p);
        heads.setMatrixAt(i, tmp.m);
      }
    });
    if (heads) heads.instanceMatrix.needsUpdate = true;
    cities.forEach((c, i) => {
      const ring = cityRings.current[i];
      if (!ring) return;
      const p = still ? 0.5 : (time * 0.45 + c.phase) % 1;
      ring.scale.setScalar(0.3 + p * 1.2);
      c.ring.opacity = (1 - p) * 0.85;
    });

    if (pulse.current) {
      const p = still ? 0.5 : (time * 0.6) % 1;
      pulse.current.scale.setScalar(0.4 + p * (1.4 + 1.6 * face));
      m.beacon.opacity = (1 - p) * (0.6 + 0.4 * face);
    }

    // Experience orbits and belief nodes fade in on their chapters.
    const we = weightAt(tt, CH.experience);
    m.orbit.opacity = 0.05 + 0.5 * we;
    if (orbits.current)
      orbits.current.children.forEach((g, i) => {
        g.rotation.y = time * (0.25 - i * 0.06) + i;
      });
    const wb = weightAt(tt, CH.beliefs);
    m.node.opacity = wb;
    if (beliefs.current) {
      beliefs.current.visible = wb > 0.01;
      beliefs.current.rotation.y = -time * 0.12;
      beliefs.current.scale.setScalar(0.7 + 0.3 * wb);
    }
    if (hud.current) hud.current.rotation.y = time * 0.03;
  });

  const seg = lowPower ? 96 : 160;

  return (
    <group>
      <ambientLight intensity={0.04} />
      <directionalLight ref={sunLight} intensity={2.6} color="#fff4e6" />

      <group rotation={[0.1, 0, 0.41]}>
        <group ref={spin}>
          <mesh material={m.earth}>
            <sphereGeometry args={[EARTH_R, seg, seg / 2]} />
          </mesh>
          <mesh ref={cloudMesh} material={m.clouds} scale={1.012}>
            <sphereGeometry args={[EARTH_R, seg, seg / 2]} />
          </mesh>
          {routes.map((r, i) => (
            <primitive key={i} object={r.tube} />
          ))}
          <instancedMesh
            ref={headsRef}
            args={[undefined, m.head, routes.length]}
            frustumCulled={false}
          >
            <sphereGeometry args={[1, 12, 8]} />
          </instancedMesh>
          {cities.map((c, i) => (
            <group key={i} position={c.p} quaternion={c.q}>
              <mesh material={m.city}>
                <circleGeometry args={[0.014, 16]} />
              </mesh>
              <mesh
                ref={(el) => {
                  cityRings.current[i] = el;
                }}
                material={c.ring}
              >
                <ringGeometry args={[0.03, 0.036, 40]} />
              </mesh>
            </group>
          ))}
          <group position={home} quaternion={beaconQuat}>
            <mesh material={m.beacon}>
              <sphereGeometry args={[0.032, 16, 12]} />
            </mesh>
            <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} material={m.beacon}>
              <cylinderGeometry args={[0.005, 0.005, 0.32, 8]} />
            </mesh>
            <mesh ref={pulse} material={m.beacon}>
              <ringGeometry args={[0.1, 0.115, 48]} />
            </mesh>
          </group>
        </group>
      </group>

      <mesh scale={1.09} material={m.atmos}>
        <sphereGeometry args={[EARTH_R, 96, 64]} />
      </mesh>

      {/* Experience: three orbits, the current role in orange. */}
      <group ref={orbits}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0.5 - i * 0.45, 0, 0.25 + i * 0.3]}>
            <group>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={m.orbit}>
                <torusGeometry args={[EARTH_R * (1.3 + i * 0.16), 0.005, 6, 200]} />
              </mesh>
              <mesh
                position={[EARTH_R * (1.3 + i * 0.16), 0, 0]}
                material={i === 0 ? m.node : m.orbit}
              >
                <sphereGeometry args={[0.06, 16, 12]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* Beliefs: one node per principle on a ring. */}
      <group ref={beliefs}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const r = EARTH_R * 1.75;
          return (
            <group key={i} position={[Math.cos(a) * r, Math.sin(a * 2) * 0.25, Math.sin(a) * r]}>
              <mesh material={m.node}>
                <octahedronGeometry args={[0.11, 0]} />
              </mesh>
              <mesh material={m.node}>
                <torusGeometry args={[0.2, 0.004, 6, 48]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Fine tick ring around the planet. */}
      <group ref={hud} rotation={[0.18, 0, 0.08]}>
        <lineSegments geometry={ringTicks} material={m.hud} />
      </group>
    </group>
  );
}
