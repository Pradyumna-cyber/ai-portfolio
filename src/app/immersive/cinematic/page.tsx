import type { Metadata } from "next";
import { CinematicPage } from "@/experiences/cinematic";

export const metadata: Metadata = { title: "Immersive · Cinematic intro" };

export default function Page() {
  return <CinematicPage />;
}
