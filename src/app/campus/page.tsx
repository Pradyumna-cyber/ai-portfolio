import type { Metadata } from "next";
import { CampusPage } from "@/components/world/campus-page";

export const metadata: Metadata = { title: "Campus" };

export default function Page() {
  return <CampusPage />;
}
