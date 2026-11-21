"use client";
/* eslint-disable react-hooks/immutability -- the camera, groups and the flash element are driven imperatively each frame. */
import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { DeviceProfile } from "@/experiences/shared/device";
import { FilmLook, Studio } from "@/experiences/shared/studio";
import { cameraPath } from "@/experiences/shared/timeline";
import { Bust } from "./bust";
import { Earth } from "./earth";
import { BUST_SHOTS, CUT, LAST, WORLD_SHOTS, flashAt, worldTime } from "./timeline";

export default function Design2Scene({
  target,
  flash,
  device,
}: {
  target: RefObject<number>;
  flash: RefObject<HTMLDivElement | null>;
  device: DeviceProfile;
}) {
  return (
    <Canvas
      className="d2-canvas"
      flat
      dpr={device.lowPower ? [1, 1.5] : [1, 2]}
      camera={{ fov: 35, near: 0.05, far: 80, position: [0.7, 0.05, 3.3] }}
      gl={{ antialias: false, powerPreference: "high-performance", localClippingEnabled: true }}
      aria-hidden
    >
      <Studio background="#02050e" envIntensity={0.05} />
      <Director target={target} flash={flash} device={device} />
      <FilmLook lowPower={device.lowPower} bloom={1.05} />
    </Canvas>
  );
}

/** Owns the smoothed time, the camera, the act switch and the flash. */
function Director({
  target,
  flash,
  device,
}: {
  target: RefObject<number>;
  flash: RefObject<HTMLDivElement | null>;
  device: DeviceProfile;
}) {
  const still = device.reducedMotion;
  const t = useRef(target.current ?? 0);
  const act1 = useRef<THREE.Group>(null);
  const act2 = useRef<THREE.Group>(null);
  const paths = useMemo(
    () => ({ bust: cameraPath(BUST_SHOTS), world: cameraPath(WORLD_SHOTS) }),
    [],
  );
  const v = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);

  useFrame((state, dt) => {
    const goal = THREE.MathUtils.clamp(target.current ?? 0, 0, LAST);
    t.current = still ? goal : THREE.MathUtils.damp(t.current, goal, 3, Math.min(dt, 0.1));
    const tt = t.current;
    const inside = tt >= CUT;

    if (act1.current) act1.current.visible = !inside;
    if (act2.current) act2.current.visible = inside;

    if (!inside) {
      paths.bust.sample(Math.min(tt, 1), v.pos, v.look);
      // Past the last shot keep pushing through the visor until the flash covers the cut.
      if (tt > 1) v.pos.z -= (tt - 1) * 0.75;
      // Portrait screens: step back so the head and shoulders fit.
      const aspect = state.size.width / state.size.height;
      if (aspect < 1) {
        const k = (1 - aspect) * (1 - Math.min(tt, 1));
        v.pos.z += k * 2.4;
        // Aim lower so the head sits in the upper half, leaving room for the text below.
        v.look.y -= k * 0.75;
        v.pos.y -= k * 0.35;
      }
    } else {
      paths.world.sample(worldTime(tt), v.pos, v.look);
    }
    if (!still && !device.touch) {
      const k = inside ? 0.35 : 0.22 * (1 - Math.min(1, tt));
      v.pos.x += state.pointer.x * k;
      v.pos.y += state.pointer.y * k * 0.6;
    }
    state.camera.position.copy(v.pos);
    state.camera.lookAt(v.look);

    if (flash.current) flash.current.style.opacity = String(flashAt(tt));
  });

  return (
    <>
      <group ref={act1}>
        <Suspense fallback={null}>
          <Bust t={t} still={still} />
        </Suspense>
      </group>
      <group ref={act2} visible={false}>
        <Suspense fallback={null}>
          <Earth t={t} still={still} lowPower={device.lowPower} />
        </Suspense>
        <Sparkles
          count={device.lowPower ? 120 : 260}
          scale={[30, 18, 30]}
          size={2}
          speed={still ? 0 : 0.2}
          opacity={0.35}
          color="#ffffff"
        />
      </group>
    </>
  );
}
