import Link from "next/link";
import { portfolio } from "@/content/portfolio";
import { CinematicEntry } from "./cinematic-entry";

/** Scenario 1 page body: the film, ending in the live PA/OS on the character's monitor. */
export function CinematicPage() {
  return (
    <main id="main">
      <CinematicEntry />
      {/* Crawlable / screen-reader summary of the same content. */}
      <section className="sr-only" aria-label="Portfolio overview">
        <h1>
          {portfolio.person.name} · {portfolio.person.identity}
        </h1>
        <p>{portfolio.thesis}</p>
        {portfolio.projects.map((p) => (
          <p key={p.slug}>
            {p.name}: {p.summary}
          </p>
        ))}
        <Link href="/standard">Read the standard portfolio</Link>
      </section>
    </main>
  );
}
