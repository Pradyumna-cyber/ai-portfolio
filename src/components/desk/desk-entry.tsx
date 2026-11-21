"use client";
import dynamic from "next/dynamic";

const DeskExperience = dynamic(() => import("./desk-experience"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100dvh",
        display: "grid",
        placeContent: "center",
        background: "#efe4d3",
        color: "#2c3038",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <p>Setting up the desk…</p>
    </div>
  ),
});

export function DeskEntry() {
  return <DeskExperience />;
}
