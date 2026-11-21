"use client";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * On-screen joystick for touch *and* mouse. Reports a vector in [-1, 1] (x right, y down)
 * on every move, and (0, 0) on release. Uses pointer capture so the drag
 * keeps working when the finger leaves the base.
 */
export function Joystick({
  onMove,
  className = "",
  label = "Move",
}: {
  onMove: (x: number, y: number) => void;
  className?: string;
  label?: string;
}) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (e: ReactPointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const radius = r.width / 2;
    let x = (e.clientX - (r.left + radius)) / radius;
    let y = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    // Small dead zone so a resting thumb doesn't drift.
    const dz = len < 0.12 ? 0 : 1;
    onMove(x * dz, y * dz);
    setKnob({ x, y });
  };
  const release = () => {
    active.current = null;
    onMove(0, 0);
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      className={`joystick-base ${className}`}
      role="application"
      aria-label={`${label} joystick: drag to move`}
      onPointerDown={(e) => {
        e.stopPropagation();
        active.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone (cancelled touch); the drag simply won't be captured.
        }
        update(e);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div
        className="joystick-knob"
        style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }}
      />
    </div>
  );
}
