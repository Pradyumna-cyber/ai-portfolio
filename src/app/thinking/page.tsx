import { BrainCircuit, GitBranch, SearchCheck } from "lucide-react";
import { portfolio } from "@/content/portfolio";

export const metadata = {
  title: "Systems Thinking",
  description: "The principles behind Pradyumna Aher's applied AI work.",
};

const areas = portfolio.thinking.map((area, index) => ({
  ...area,
  icon: [BrainCircuit, SearchCheck, GitBranch][index],
}));

export default function ThinkingPage() {
  return (
    <div id="main" className="shell page-space">
      <p className="eyebrow">Systems thinking</p>
      <h1 className="page-title">Ideas worth operationalizing.</h1>
      <p className="page-intro">
        A practical engineering lens on generative AI, retrieval, agents, and product delivery.
      </p>
      <div className="thinking-grid">
        {areas.map((area) => (
          <article key={area.title}>
            <area.icon size={22} className="text-accent" aria-hidden="true" />
            <h2>{area.title}</h2>
            <p>{area.body}</p>
            <span className="font-mono text-xs text-muted">{portfolio.thinkingStatus}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
