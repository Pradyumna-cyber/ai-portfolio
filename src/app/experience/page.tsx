import { portfolio } from "@/content/portfolio";

export const metadata = {
  title: "Experience",
  description: "Engineering experience and professional trajectory.",
};

export default function ExperiencePage() {
  return (
    <div id="main" className="shell page-space">
      <p className="eyebrow">Professional context</p>
      <h1 className="page-title">Reliability before novelty.</h1>
      <p className="page-intro">
        The move toward AI engineering is grounded in building interfaces, delivering business
        requirements, and solving production problems.
      </p>
      <div className="experience-list mt-14">
        {portfolio.experience.map((item) => (
          <article key={`${item.company}-${item.role}`}>
            <p className="font-mono text-xs text-muted">{item.period}</p>
            <div>
              <h2>
                {item.role} <span>· {item.company}</span>
              </h2>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
