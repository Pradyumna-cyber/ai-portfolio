"use client";
import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PortfolioAssistant } from "./portfolio-assistant";
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Full-screen 3D pages render their own chrome.
  const world =
    pathname === "/" ||
    pathname === "/desk" ||
    pathname === "/scroll" ||
    pathname === "/campus" ||
    pathname === "/vr";
  return (
    <>
      {!world && <SiteHeader />}
      {children}
      {!world && (
        <>
          <SiteFooter />
          <PortfolioAssistant />
        </>
      )}
    </>
  );
}
