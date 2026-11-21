import type { Metadata } from "next";
import { CinematicPage } from "@/experiences/cinematic";

export const metadata: Metadata = { title: "Immersive" };

/** The cinematic scenario: the character walks in, sits, and the camera reveals the portfolio. */
export default function Page() {
  return <CinematicPage />;
}
