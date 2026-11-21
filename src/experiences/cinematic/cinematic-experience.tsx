"use client";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PaOS } from "@/components/pa-os/pa-os";
import { portfolio } from "@/content/portfolio";
import type { DeviceProfile } from "../shared/device";
import { CinematicScene, type Beat, type CineMode, type ScreenOverlay } from "./cinematic-scene";

/**
 * Scenario 1. A short film: the character walks in, sits, swivels to the desk, and the
 * camera pushes into the monitor. The monitor then *becomes* the live PA/OS portfolio
 * (folders + P’AI chat), glued to the 3D display. "Back to desk" pulls the camera back.
 *
 * film → os (camera parked on the monitor) ⇄ room (watching the character work)
 */
type Phase = "film" | "os" | "room";

export default function CinematicExperience({
  device,
  onReplay,
}: {
  device: DeviceProfile;
  onReplay: () => void;
}) {
  const [beat, setBeat] = useState<Beat>("establish");
  const [mode, setMode] = useState<CineMode>("film");
  const [phase, setPhase] = useState<Phase>("film");
  const [fullscreen, setFullscreen] = useState(false);
  const skip = useRef(false);
  const overlay = useRef<ScreenOverlay>({ el: null, fullscreen: false });

  // Full-viewport experience: no page scroll underneath.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    overlay.current.fullscreen = fullscreen;
  }, [fullscreen]);

  const onFilmEnd = useCallback(() => setMode("screen"), []);
  const onArrive = useCallback(() => {
    setPhase("os");
    // On phones the 16:10 monitor is too small to use, so the OS expands to fill the screen.
    if (window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.9)
      requestAnimationFrame(() => requestAnimationFrame(() => setFullscreen(true)));
  }, []);
  const toRoom = useCallback(() => {
    setFullscreen(false);
    setPhase("room");
    setMode("room");
  }, []);
  const toScreen = useCallback(() => setMode("screen"), []);

  useEffect(() => {
    if (phase !== "film") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip.current = true;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const inFilm = phase === "film" && mode === "film";
  const letterbox = inFilm && beat !== "push";
  const caption = inFilm && ["walk", "turn", "sit", "settle"].includes(beat);

  return (
    <div className="cine-root" aria-label="Pradyumna Aher – cinematic portfolio">
      <Canvas
        className="cine-canvas"
        flat
        shadows="soft"
        dpr={device.lowPower ? [1, 1.4] : [1, 2]}
        camera={{ fov: 35, near: 0.05, far: 60, position: [5.3, 2.7, 4.7] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CinematicScene
          mode={mode}
          onBeat={setBeat}
          onFilmEnd={onFilmEnd}
          onArrive={onArrive}
          skip={skip}
          overlay={overlay}
          lowPower={device.lowPower}
        />
      </Canvas>

      <div className={`cine-bars${letterbox ? "" : "is-open"}`} aria-hidden="true">
        <span />
        <span />
      </div>

      <div className={`cine-caption${caption ? "is-on" : ""}`} aria-hidden={!caption}>
        <p>{portfolio.person.name}</p>
        <span>{portfolio.person.identity}</span>
      </div>

      {inFilm && (
        <button
          type="button"
          className="cine-skip"
          onClick={() => {
            skip.current = true;
          }}
        >
          Skip intro <kbd>Esc</kbd>
        </button>
      )}

      {phase === "os" && (
        <div
          className={`cine-screen${fullscreen ? "is-fullscreen" : ""}`}
          ref={(el) => {
            overlay.current.el = el;
          }}
        >
          <PaOS onExit={toRoom} reducedMotion={device.reducedMotion} />
        </div>
      )}

      {phase === "room" && (
        <div className="cine-room-ui">
          <button type="button" className="cine-primary" onClick={toScreen}>
            Back to the screen →
          </button>
          <Link href="/standard" className="cine-ghost">
            Classic portfolio ↗
          </Link>
          <button type="button" className="cine-ghost" onClick={onReplay}>
            ↺ Replay intro
          </button>
        </div>
      )}
    </div>
  );
}
