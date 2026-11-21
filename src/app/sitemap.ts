import type { MetadataRoute } from "next";
import { portfolio } from "@/content/portfolio";
const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/standard",
    "/work",
    "/experience",
    "/thinking",
    ...portfolio.projects.map((project) => `/work/${project.slug}`),
  ].map((path) => ({
    url: `${url}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
