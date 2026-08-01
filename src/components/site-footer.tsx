import Link from "next/link";

import { portfolio } from "@/content/portfolio";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="shell flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{portfolio.person.name}</p>
          <p className="mt-1 text-sm text-muted">
            Applied AI systems, built with engineering discipline.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-muted">
          <Link href={`https://github.com/${portfolio.person.github}`} target="_blank">
            GitHub
          </Link>
          <Link href={portfolio.person.linkedin} target="_blank">
            LinkedIn
          </Link>
          <a href={`mailto:${portfolio.person.email}`}>Email</a>
        </div>
      </div>
    </footer>
  );
}
