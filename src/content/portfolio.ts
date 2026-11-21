export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  status: "Flagship" | "Applied ML" | "Mobile system" | "Browser extension";
  year: string;
  technologies: string[];
  problem: string;
  approach: string;
  decisions: string[];
  next: string;
  links: { label: string; href: string }[];
};

export const portfolio = {
  person: {
    name: "Pradyumna Aher",
    identity: "Applied AI Builder",
    role: "Software Engineer transitioning into Applied AI Engineering",
    email: "pradyumnaaher05@gmail.com",
    location: "Thane, India",
    github: "Pradyumna-cyber",
    linkedin: "https://www.linkedin.com/in/pradyumnaaher05",
  },
  thesis:
    "I build practical software systems, then use AI where it meaningfully improves the decision or experience.",
  toolkit: [
    "Python",
    "React",
    "LLMs",
    "RAG",
    "LangChain",
    "LangGraph",
    "Prompt Engineering",
    "Figma",
    "MCP",
    "Vector Search & Databases",
  ],
  thinking: [
    {
      title: "LLM application design",
      body: "Focus on user workflows, evaluation requirements, and the boundary between deterministic software and probabilistic capability.",
    },
    {
      title: "Retrieval and trust",
      body: "RAG is useful only when source quality, retrieval relevance, and answer grounding are treated as product requirements.",
    },
    {
      title: "Agentic orchestration",
      body: "Agent workflows need explicit state, tool boundaries, and failure paths—not just a chain of prompts.",
    },
  ],
  thinkingStatus: "Research notes incoming",
  now: {
    label: "Current direction",
    title: "Applied AI systems with product-grade foundations.",
    body: "Combining enterprise software delivery with hands-on work across LLM applications, retrieval, orchestration, and modern full-stack development.",
  },
  principles: [
    {
      title: "Understand the workflow",
      body: "I begin with the user task, the decision involved, the available data, and what a useful outcome looks like—before choosing a model.",
    },
    {
      title: "Define the AI opportunity",
      body: "I separate deterministic application logic from the parts where AI can improve interpretation, retrieval, classification, or interaction.",
    },
    {
      title: "Design system and trust boundaries",
      body: "I map the interface, APIs, data sources, AI capability, validation, and fallback paths—making human control explicit where it matters.",
    },
    {
      title: "Build one complete user flow",
      body: "I build a small vertical slice first so the real workflow can be tested end to end before adding complexity.",
    },
    {
      title: "Evaluate in context",
      body: "I test with realistic inputs and failure cases, measuring quality, retrieval relevance, latency, and cost rather than relying on a happy-path demo.",
    },
    {
      title: "Deploy, observe, and improve",
      body: "I treat reliability as product work: clear service boundaries, tracing, feedback, versioning, and continuous iteration make the system useful in practice.",
    },
  ],
  experience: [
    {
      company: "Tata Consultancy Services",
      role: "Systems Engineer",
      period: "Jan 2025 — Present",
      detail:
        "Enterprise frontend delivery, UI performance work, production issue resolution, and cross-functional collaboration.",
    },
    {
      company: "Ernst & Young",
      role: "Application Developer",
      period: "Dec 2023 — Jun 2024",
      detail: "Built responsive audit workflows with secure login and export capabilities.",
    },
    {
      company: "Ernst & Young",
      role: "Prototype Designer",
      period: "Jul 2023",
      detail:
        "Designed a web prototype that improved the development pipeline and user experience.",
    },
  ],
  projects: [
    {
      slug: "seatpeekr",
      name: "SeatPeekr",
      eyebrow: "Peek before you pick",
      summary:
        "A browser extension that turns cinema seat selection into an estimated 3D view, helping moviegoers compare screen distance and viewing angles before booking.",
      status: "Browser extension",
      year: "2026",
      technologies: ["React", "TypeScript", "Three.js", "Vite", "Chrome Manifest V3"],
      problem:
        "A top-down cinema seat map shows where a seat is, but makes it difficult to judge how the screen will look from that position.",
      approach:
        "Detect seating layouts on supported BookMyShow and District booking pages, then render an estimated cinema view with Three.js inside a React extension panel so users can compare seats before booking.",
      decisions: [
        "Bring the preview into the existing seat-selection workflow through a browser extension.",
        "Use seating-layout information to estimate screen perspective, distance, and viewing angle.",
        "Label previews as estimates because screen dimensions, row elevation, and auditorium geometry can vary between theatres.",
      ],
      next: "Improve preview accuracy across more auditorium layouts and validate estimates against real cinema seating positions.",
      links: [{ label: "Visit SeatPeekr", href: "https://seatpeekr.vercel.app/" }],
    },
    {
      slug: "ai-finance-tracker",
      name: "AI Finance Tracker",
      eyebrow: "Personal finance assistant",
      summary:
        "A full-stack finance workflow that uses AI to categorize spending, surface patterns, and produce personalized recommendations.",
      status: "Flagship",
      year: "2026",
      technologies: ["React", "TypeScript", "FastAPI", "Python", "LangChain", "OpenAI API"],
      problem:
        "Personal finance data is difficult to turn into timely, understandable action when categorization and analysis are manual.",
      approach:
        "A React client and FastAPI service establish the product workflow; an LLM layer supports categorization and recommendation generation inside that workflow.",
      decisions: [
        "Use a typed service boundary between dashboard and analysis layer.",
        "Keep core budgeting flows deterministic; use AI for interpretation and assistance.",
        "Design recommendations around current spend context rather than generic financial advice.",
      ],
      next: "Add evaluation cases for categorization quality, explicit recommendation citations, and user-controlled privacy settings.",
      links: [
        { label: "Visit AI Finance Tracker", href: "https://airafinancetracker.netlify.app/" },
      ],
    },
  ] satisfies Project[],
};

export function getProject(slug: string) {
  return portfolio.projects.find((project) => project.slug === slug);
}
