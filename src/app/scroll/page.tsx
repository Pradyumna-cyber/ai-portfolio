import type { Metadata } from "next";
import { ScrollExperience } from "@/components/scroll/scroll-experience";
import { portfolio } from "@/content/portfolio";

export const metadata: Metadata = {
  title: "Scroll",
  description: portfolio.thesis,
};

export default function ScrollPage() {
  return <ScrollExperience />;
}
