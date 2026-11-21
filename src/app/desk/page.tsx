import type { Metadata } from "next";
import { DeskEntry } from "@/components/desk/desk-entry";
import { portfolio } from "@/content/portfolio";

export const metadata: Metadata = {
  title: "Desk",
  description: portfolio.thesis,
};

export default function DeskPage() {
  return (
    <main id="main">
      <DeskEntry />
      <section className="sr-only" aria-label="Portfolio overview">
        <h2>
          {portfolio.person.name} · {portfolio.person.identity}
        </h2>
        <p>{portfolio.thesis}</p>
        {portfolio.projects.map((p) => (
          <p key={p.slug}>
            {p.name}: {p.summary}
          </p>
        ))}
      </section>
    </main>
  );
}
