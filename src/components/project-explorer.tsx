"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Project } from "@/content/portfolio";
import { cn } from "@/lib/utils";

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [selectedSlug, setSelectedSlug] = useState(projects[0]?.slug);
  const selected = projects.find((project) => project.slug === selectedSlug) ?? projects[0];

  if (!selected) return null;

  return (
    <section className="project-explorer" aria-label="Project explorer">
      <div className="project-list">
        <p className="eyebrow">Project index</p>
        <div className="mt-5 grid gap-1">
          {projects.map((project, index) => (
            <button
              key={project.slug}
              type="button"
              onClick={() => setSelectedSlug(project.slug)}
              className={cn(
                "project-index-item",
                selected.slug === project.slug && "project-index-item-active",
              )}
            >
              <span className="font-mono text-xs text-muted">0{index + 1}</span>
              <span>{project.name}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform",
                  selected.slug === project.slug && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
      <article className="project-detail">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="status-badge">{selected.status}</span>
          <span className="font-mono text-xs text-muted">{selected.year}</span>
        </div>
        <p className="eyebrow mt-8">{selected.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {selected.name}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{selected.summary}</p>
        <div className="mt-9 grid gap-7 border-y border-border py-7 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">System intent</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{selected.problem}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Implementation direction</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{selected.approach}</p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          {selected.technologies.map((technology) => (
            <span key={technology} className="tech-tag">
              {technology}
            </span>
          ))}
        </div>
        <Link href={`/work/${selected.slug}`} className="button-secondary mt-9">
          Inspect case study <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </article>
    </section>
  );
}
