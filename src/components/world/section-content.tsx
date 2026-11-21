"use client";
import Link from "next/link";
import { portfolio } from "@/content/portfolio";
import { getDestination, type Section } from "./model";
export function SectionContent({
  section,
  project,
  onProject,
}: {
  section: Section;
  project: string;
  onProject: (slug: string) => void;
}) {
  const selected = portfolio.projects.find((p) => p.slug === project) ?? portfolio.projects[0];
  return (
    <div className="section-content">
      <span className="world-kicker">
        {getDestination(section).number} / {getDestination(section).subtitle}
      </span>
      <h2>{getDestination(section).name}</h2>
      {section === "about" && (
        <>
          <h3>{portfolio.person.name}</h3>
          <p>{portfolio.person.role}</p>
          <p>{portfolio.person.location}</p>
          <blockquote>{portfolio.thesis}</blockquote>
          <h3>{portfolio.now.title}</h3>
          <p>{portfolio.now.body}</p>
        </>
      )}
      {section === "experience" &&
        portfolio.experience.map((e) => (
          <article key={e.role}>
            <span className="content-meta">{e.period}</span>
            <h3>
              {e.role} · {e.company}
            </h3>
            <p>{e.detail}</p>
          </article>
        ))}
      {section === "projects" && (
        <>
          <div className="project-switch" aria-label="Select project">
            {portfolio.projects.map((p) => (
              <button
                key={p.slug}
                aria-pressed={p.slug === selected.slug}
                onClick={() => onProject(p.slug)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <span className="content-meta">
            {selected.year} · {selected.status}
          </span>
          <h3>{selected.name}</h3>
          <p>{selected.summary}</p>
          <h4>The problem</h4>
          <p>{selected.problem}</p>
          <h4>The approach</h4>
          <p>{selected.approach}</p>
          <h4>Engineering decisions</h4>
          <ul>
            {selected.decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <div className="world-tags">
            {selected.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <h4>Next improvements</h4>
          <p>{selected.next}</p>
          <div className="content-links">
            <Link href={`/work/${selected.slug}`} target="_blank">
              Full case study ↗
            </Link>
            {selected.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} ↗
              </a>
            ))}
          </div>
        </>
      )}
      {section === "thinking" && (
        <>
          {portfolio.thinking.map((t) => (
            <article key={t.title}>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
              <span className="content-meta">{portfolio.thinkingStatus}</span>
            </article>
          ))}
          <h3>From workflow to reliable AI capability</h3>
          {portfolio.principles.map((p, i) => (
            <article key={p.title}>
              <h4>
                0{i + 1} · {p.title}
              </h4>
              <p>{p.body}</p>
            </article>
          ))}
        </>
      )}
      {section === "skills" && (
        <>
          <h3>AI & orchestration</h3>
          <div className="world-tags">
            {portfolio.toolkit
              .filter((t) => !["Python", "React", "Figma"].includes(t))
              .map((t) => (
                <span key={t}>{t}</span>
              ))}
          </div>
          <h3>Application & product tools</h3>
          <div className="world-tags">
            {["Python", "React", "Figma"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <h3>Published project stacks</h3>
          {portfolio.projects.map((p) => (
            <article key={p.slug}>
              <h4>{p.name}</h4>
              <p>{p.technologies.join(" · ")}</p>
            </article>
          ))}
        </>
      )}
      {section === "contact" && (
        <>
          <h3>Start a conversation.</h3>
          <p>Public channels from Pradyumna’s portfolio.</p>
          <div className="contact-actions">
            <a href={`mailto:${portfolio.person.email}`}>{portfolio.person.email} ↗</a>
            <a
              href={`https://github.com/${portfolio.person.github}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub · {portfolio.person.github} ↗
            </a>
            <a href={portfolio.person.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn ↗
            </a>
          </div>
          <p>{portfolio.person.location}</p>
        </>
      )}
    </div>
  );
}
