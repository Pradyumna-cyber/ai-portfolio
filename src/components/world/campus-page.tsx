import Link from "next/link";
import { WorldEntry } from "@/components/world/world-entry";
import { portfolio } from "@/content/portfolio";

/** The walkable campus plus its screen-reader summary (homepage when ACTIVE_DESIGN is "campus"). */
export function CampusPage() {
  return (
    <>
      <WorldEntry />
      <section className="sr-only" aria-label="Portfolio overview">
        <h2>
          {portfolio.person.name} · {portfolio.person.identity}
        </h2>
        <p>{portfolio.person.role}</p>
        <p>{portfolio.thesis}</p>
        <p>{portfolio.now.body}</p>
        {portfolio.experience.map((e) => (
          <p key={e.role}>
            {e.role}, {e.company}, {e.period}. {e.detail}
          </p>
        ))}
        {portfolio.projects.map((p) => (
          <article key={p.slug}>
            <h3>{p.name}</h3>
            <p>{p.summary}</p>
            <Link href={`/work/${p.slug}`}>Read {p.name} case study</Link>
          </article>
        ))}
        <p>{portfolio.toolkit.join(", ")}</p>
        <Link href="/standard">Read the standard portfolio</Link>
      </section>
    </>
  );
}
