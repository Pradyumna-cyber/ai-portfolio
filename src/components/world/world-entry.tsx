"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
const PortfolioWorld = dynamic(() => import("./portfolio-world"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        gap: 20,
        background: "#e7eadb",
        color: "#304b3a",
        textAlign: "center",
      }}
    >
      <p>Preparing Pradyumna’s portfolio world…</p>
      <Link href="/standard">View standard portfolio ↗</Link>
    </div>
  ),
});
export function WorldEntry() {
  return <PortfolioWorld />;
}
