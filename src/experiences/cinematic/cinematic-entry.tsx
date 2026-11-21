"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaOS } from "@/components/pa-os/pa-os";
import { useDeviceProfile } from "../shared/device";
import "./cinematic.css";

/** Solid cover rendered on the server too, so nothing flashes before the film. */
function Cover() {
  return <div className="cine-cover" aria-hidden="true" />;
}

const CinematicExperience = dynamic(() => import("./cinematic-experience"), {
  ssr: false,
  loading: Cover,
});

/**
 * No WebGL or "reduce motion" → skip the film and open PA/OS full-screen directly.
 * The portfolio content never depends on the 3D layer.
 */
export function CinematicEntry() {
  const device = useDeviceProfile();
  const router = useRouter();
  const [run, setRun] = useState(0);

  if (device === null) return <Cover />;
  if (!device.webgl || device.reducedMotion)
    return (
      <div className="cine-static">
        <PaOS
          onExit={() => router.push("/standard")}
          exitLabel="Classic portfolio"
          reducedMotion={device.reducedMotion}
        />
      </div>
    );
  return <CinematicExperience key={run} device={device} onReplay={() => setRun((r) => r + 1)} />;
}
