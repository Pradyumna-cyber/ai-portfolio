import { ArrowDownRight, ArrowUpRight, CircleDot } from "lucide-react";
import Link from "next/link";

import { ProjectExplorer } from "@/components/project-explorer";
import { SkillsMarquee } from "@/components/skills-marquee";
import { portfolio } from "@/content/portfolio";

export default function HomePage() {
  return (
    <div id="main">
      <section className="shell hero-section">
        <div className="hero-grid">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <CircleDot size={13} className="text-accent" aria-hidden="true" />{" "}
              {portfolio.person.location} · Available for AI engineering opportunities
            </p>
            <h1 className="hero-title">
              Building <span>applied AI systems</span> with product and engineering discipline.
            </h1>
            <p className="hero-copy">{portfolio.thesis}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="button-primary" href="/work">
                Explore selected work <ArrowDownRight size={17} aria-hidden="true" />
              </Link>
              <a className="button-secondary" href={`mailto:${portfolio.person.email}`}>
                Start a conversation <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
          <aside className="hero-signal">
            <p className="eyebrow">System briefing</p>
            <dl className="mt-8 divide-y divide-border">
              <div>
                <dt>Current role</dt>
                <dd>Systems Engineer · TCS</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>Building intelligent AI applications with LLMs, Agentic AI, RAG & MCP.</dd>
              </div>
              <div>
                <dt>Foundation</dt>
                <dd>Full-stack delivery and product prototyping</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
      <section className="shell section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="section-title">Projects as engineering records.</h2>
          </div>
          <p>
            Open a project to inspect the problem, approach, and decisions—not just a technology
            list.
          </p>
        </div>
        <ProjectExplorer projects={portfolio.projects} />
      </section>
      <section className="shell section-grid border-t border-border">
        <div>
          <p className="eyebrow">How I approach AI systems</p>
          <h2 className="section-title">From workflow to reliable AI capability.</h2>
          <p className="approach-intro">
            I build AI systems from the workflow outward—combining deterministic software, useful AI
            capability, reliable data flow, evaluation, and thoughtful product design.
          </p>
        </div>
        <div className="grid gap-8">
          {portfolio.principles.map((principle, index) => (
            <article key={principle.title} className="principle">
              <span className="font-mono text-xs text-accent">0{index + 1}</span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SkillsMarquee skills={portfolio.toolkit} />
      <section className="shell section-space">
        <div className="contact-panel">
          <p className="eyebrow">Open channel</p>
          <h2>Have an AI product problem worth solving?</h2>
          <p>
            I’m interested in building trustworthy, useful AI experiences with teams that care about
            the whole system.
          </p>
          <a href={`mailto:${portfolio.person.email}`} className="button-primary">
            {portfolio.person.email} <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
