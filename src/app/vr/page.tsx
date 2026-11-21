import type { Metadata } from "next";
import { Design2Experience } from "@/components/design2/design2-experience";
import { portfolio } from "@/content/portfolio";

export const metadata: Metadata = {
  title: { absolute: `${portfolio.person.name} - Portfolio` },
  description: portfolio.thesis,
};

export default function Page() {
  return <Design2Experience />;
}
