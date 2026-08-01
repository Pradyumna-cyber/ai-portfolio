import { BrainCircuit, GitBranch, SearchCheck } from "lucide-react";

export const metadata = {
  title: "Systems Thinking",
  description: "The principles behind Pradyumna Aher's applied AI work.",
};

const areas = [
  {
    icon: BrainCircuit,
    title: "LLM application design",
    body: "Focus on user workflows, evaluation requirements, and the boundary between deterministic software and probabilistic capability.",
  },
  {
    icon: SearchCheck,
    title: "Retrieval and trust",
    body: "RAG is useful only when source quality, retrieval relevance, and answer grounding are treated as product requirements.",
  },
  {
    icon: GitBranch,
    title: "Agentic orchestration",
    body: "Agent workflows need explicit state, tool boundaries, and failure paths—not just a chain of prompts.",
  },
];

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
            <span className="font-mono text-xs text-muted">Research notes incoming</span>
          </article>
        ))}
      </div>
    </div>
  );
}
