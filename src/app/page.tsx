import { Design2Experience } from "@/components/design2/design2-experience";
import { ScrollExperience } from "@/components/scroll/scroll-experience";
import { CampusPage } from "@/components/world/campus-page";
import { ACTIVE_DESIGN } from "@/designs";

/** The homepage shows whichever design src/designs.ts marks as active. */
export default function HomePage() {
  if (ACTIVE_DESIGN === "design1") return <ScrollExperience />;
  if (ACTIVE_DESIGN === "design2") return <Design2Experience />;
  return <CampusPage />;
}
