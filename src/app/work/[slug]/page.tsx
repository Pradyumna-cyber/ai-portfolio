import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProject, portfolio } from "@/content/portfolio";
import { FinanceTrackerPreview } from "@/components/finance-tracker-preview";

export function generateStaticParams() {
  return portfolio.projects.map((project) => ({ slug: project.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const project = getProject(slug);
    return { title: project?.name ?? "Project", description: project?.summary };
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return (
    <article id="main" className="shell case-study">
      <Link href="/work" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> All work
      </Link>
      <p className="eyebrow mt-12">
        {project.status} · {project.year}
      </p>
      <h1 className="page-title mt-4">{project.name}</h1>
      <p className="page-intro">{project.summary}</p>
      <div className="case-study-grid">
        <section>
          <p className="eyebrow">01 · Problem</p>
          <p>{project.problem}</p>
        </section>
        <section>
          <p className="eyebrow">02 · Approach</p>
          <p>{project.approach}</p>
        </section>
        <section className="md:col-span-2">
          <p className="eyebrow">03 · Key decisions</p>
          <ul>
            {project.decisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ul>
        </section>
        <section>
          <p className="eyebrow">04 · Technology</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <span className="tech-tag" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </section>
        <section>
          <p className="eyebrow">05 · Next improvements</p>
          <p>{project.next}</p>
        </section>
      </div>
      {project.slug === "ai-finance-tracker" ? <FinanceTrackerPreview /> : null}
      <a
        href={`https://github.com/${portfolio.person.github}`}
        target="_blank"
        className="button-secondary mt-12"
      >
        View GitHub profile <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </article>
  );
}
