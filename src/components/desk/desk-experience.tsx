"use client";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { portfolio } from "@/content/portfolio";
import { PaOS } from "@/components/pa-os/pa-os";
import { DeskScene, type DeskMode, type OverlayRefs } from "./desk-scene";
import "./desk.css";

/**
 * desk   → room view, monitor shows an idle image
 * zoom   → camera flying to the monitor
 * os     → camera parked; the live DOM "OS" sits exactly on the display
 */
type Phase = "desk" | "zoom" | "os";

export default function DeskExperience() {
  const [phase, setPhase] = useState<Phase>("desk");
  const [fullscreen, setFullscreen] = useState(false);
  const overlay = useRef<OverlayRefs>({ screen: null, pin: null, fullscreen: false });

  // Client-only component (loaded with ssr:false), so window is safe in initializers.
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [lowPower] = useState(
    () => window.matchMedia("(max-width: 640px)").matches || navigator.hardwareConcurrency <= 4,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const enter = useCallback(() => setPhase((p) => (p === "desk" ? "zoom" : p)), []);
  const arrive = useCallback(() => {
    setPhase("os");
    // On phones/portrait the 16:10 display is too small to use, so the OS
    // expands from the monitor to the full viewport once the camera lands.
    const narrow = window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.9;
    if (narrow) requestAnimationFrame(() => requestAnimationFrame(() => setFullscreen(true)));
  }, []);
  const exit = useCallback(() => {
    setFullscreen(false);
    setPhase("desk");
  }, []);

  useEffect(() => {
    overlay.current.fullscreen = fullscreen;
  }, [fullscreen]);

  const mode: DeskMode = phase === "desk" ? "desk" : "screen";

  return (
    <div className={`desk-root phase-${phase}`}>
      <Canvas
        className="desk-canvas"
        flat
        shadows="soft"
        dpr={lowPower ? [1, 1.5] : [1, 2]}
        camera={{ fov: 30, near: 0.05, far: 80, position: [6, 4, 6] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        fallback={
          <div className="desk-fallback">
            <p>This 3D desk needs WebGL.</p>
            <Link href="/standard">View the standard portfolio ↗</Link>
          </div>
        }
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <DeskScene
          mode={mode}
          onEnter={enter}
          onArrive={arrive}
          overlay={overlay}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
        />
      </Canvas>

      {phase === "desk" && (
        <>
          <header className="desk-top">
            <Link href="/" className="desk-brand">
              <span className="desk-mark">PA.</span>
              <span>
                <strong>{portfolio.person.name}</strong>
                <em>{portfolio.person.identity}</em>
              </span>
            </Link>
            <Link href="/standard" className="desk-ghost">
              Standard view ↗
            </Link>
          </header>

          <div className="desk-intro">
            <p className="desk-eyebrow">Welcome to my desk</p>
            <h1>
              I think it through,
              <br />
              then <span>build it with AI.</span>
            </h1>
            <button type="button" className="desk-enter" onClick={enter}>
              Step into my workspace →
            </button>
          </div>

          <button
            type="button"
            className="desk-pin"
            tabIndex={-1}
            aria-hidden="true"
            ref={(el) => {
              overlay.current.pin = el;
            }}
            onClick={enter}
          >
            <span className="desk-pin-dot" />
            <span className="desk-pin-label">Click the screen</span>
          </button>
        </>
      )}

      {phase === "os" && (
        <div
          className={`desk-screen${fullscreen ? "is-fullscreen" : ""}`}
          ref={(el) => {
            overlay.current.screen = el;
          }}
        >
          <PaOS onExit={exit} reducedMotion={reducedMotion} />
        </div>
      )}
    </div>
  );
}
