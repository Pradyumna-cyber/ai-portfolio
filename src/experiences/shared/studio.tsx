"use client";
/* eslint-disable react-hooks/immutability -- configuring the Three.js scene's environment in an effect is intended. */
import { useThree } from "@react-three/fiber";
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
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Image-based lighting generated locally (no HDR download) + scene background colour. */
export function Studio({
  background,
  envIntensity = 0.35,
}: {
  background: string;
  envIntensity?: number;
}) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = envIntensity;
    scene.background = new THREE.Color(background);
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, background, envIntensity]);
  return null;
}

/**
 * Film-like post stack: ambient occlusion, bloom for emissives, AgX tone mapping (Blender's
 * default view transform), a light grade and vignette. Phones skip AO.
 * The Canvas must use `flat` (no renderer tone mapping) because tone mapping happens here.
 */
export function FilmLook({ lowPower, bloom = 0.75 }: { lowPower: boolean; bloom?: number }) {
  if (lowPower)
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={bloom * 0.8} />
        <Vignette offset={0.3} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <HueSaturation saturation={0.15} />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.45} distanceFalloff={0.8} intensity={2.4} quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={1} intensity={bloom} radius={0.7} />
      <Vignette offset={0.3} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation saturation={0.15} />
      <BrightnessContrast contrast={0.08} />
    </EffectComposer>
  );
}
