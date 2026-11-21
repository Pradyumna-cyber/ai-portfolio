"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { portfolio } from "@/content/portfolio";
import { useDeviceProfile } from "@/experiences/shared/device";
import { CHAPTERS, chapterTime, type Chapter } from "./timeline";
import "./scroll.css";

const ScrollScene = dynamic(() => import("./scroll-scene"), { ssr: false });

const LABELS: Record<Chapter, string> = {
  hero: "Intro",
  thesis: "Approach",
  experience: "Experience",
  projects: "Projects",
  principles: "Process",
  contact: "Contact",
};

/**
 * Scroll-driven portfolio. The page scrolls natively; a fixed WebGL canvas sits behind
 * the sections and reads chapter time from `progress`. Content is plain HTML, so it is
 * readable, linkable and indexable with or without WebGL.
 */
export function ScrollExperience() {
  const device = useDeviceProfile();
  const progress = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const els = root.current?.querySelectorAll<HTMLElement>(".sx-section") ?? [];
      const tops = Array.from(els, (el) => el.offsetTop);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = chapterTime(tops, window.scrollY, max);
      progress.current = t;
      setActive(Math.round(t));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const { person } = portfolio;

  return (
    <div className="sx-root" ref={root}>
      {device?.webgl && (
        <div className="sx-stage" aria-hidden>
          <ScrollScene target={progress} device={device} />
        </div>
      )}

      <header className="sx-top">
        <span className="sx-brand">{person.name}</span>
        <nav aria-label="Other views">
          <Link href="/campus">Play the campus</Link>
          <Link href="/standard">Standard</Link>
        </nav>
      </header>

      <nav className="sx-dots" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a key={c} href={`#${c}`} aria-current={active === i ? "step" : undefined}>
            <span>{LABELS[c]}</span>
          </a>
        ))}
      </nav>

      <main id="main">
        <section id="hero" className="sx-section" data-align="center">
          <div className="sx-panel sx-hero">
            <p className="sx-eyebrow">{person.identity}</p>
            <h1>{person.name}</h1>
            <p className="sx-lede">{portfolio.thesis}</p>
            <p className="sx-cue" aria-hidden>
              Scroll
            </p>
          </div>
        </section>

        <section id="thesis" className="sx-section" data-align="left">
          <div className="sx-panel">
            <p className="sx-eyebrow">{portfolio.now.label}</p>
            <h2>{portfolio.now.title}</h2>
            <p>{portfolio.now.body}</p>
            <ul className="sx-chips" aria-label="Toolkit">
              {portfolio.toolkit.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="experience" className="sx-section" data-align="right">
          <div className="sx-panel">
            <p className="sx-eyebrow">Experience</p>
            <h2>Where I’ve shipped</h2>
            <ol className="sx-list">
              {portfolio.experience.map((e) => (
                <li key={`${e.company}-${e.role}`}>
                  <strong>{e.role}</strong>
                  <span>
                    {e.company} · {e.period}
                  </span>
                  <p>{e.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="projects" className="sx-section" data-align="bottom">
          <div className="sx-cards">
            {portfolio.projects.map((p) => (
              <article key={p.slug} className="sx-panel">
                <p className="sx-eyebrow">
                  {p.status} · {p.year}
                </p>
                <h2>{p.name}</h2>
                <p>{p.summary}</p>
                <p className="sx-links">
                  <Link href={`/work/${p.slug}`}>Case study</Link>
                  {p.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="principles" className="sx-section" data-align="left">
          <div className="sx-panel">
            <p className="sx-eyebrow">How I work</p>
            <h2>From workflow to a system people trust</h2>
            <ol className="sx-steps">
              {portfolio.principles.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}</strong>
                  <p>{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contact" className="sx-section" data-align="center">
          <div className="sx-panel sx-contact">
            <p className="sx-eyebrow">{person.location}</p>
            <h2>Let’s build something useful.</h2>
            <p className="sx-links">
              <a href={`mailto:${person.email}`}>{person.email}</a>
              <a href={person.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
              <a href={`https://github.com/${person.github}`} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
