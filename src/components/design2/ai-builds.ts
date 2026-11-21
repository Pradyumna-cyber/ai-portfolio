/**
 * "How I build with AI": one minimal pipeline per build, showing where a model is used and
 * what stays plain code. Every step restates something already published in
 * src/content/portfolio.ts (project approach/decisions); nothing here adds new claims.
 */
export type StepKind = "io" | "code" | "ai" | "guard";
export type Step = { label: string; kind: StepKind };
export type AiBuild = {
  name: string;
  /** Link target for the build (case study or section). */
  href: string;
  steps: Step[];
  takeaway: string;
};

export const AI_BUILDS: AiBuild[] = [
  {
    name: "AI Finance Tracker",
    href: "/work/ai-finance-tracker",
    steps: [
      { label: "Spending data", kind: "io" },
      { label: "FastAPI · typed boundary", kind: "code" },
      { label: "LLM via LangChain · categorise + recommend", kind: "ai" },
      { label: "Budgeting stays deterministic", kind: "guard" },
      { label: "React dashboard", kind: "io" },
    ],
    takeaway: "AI interprets the data; the core budgeting flow never depends on it.",
  },
  {
    name: "SeatPeekr",
    href: "/work/seatpeekr",
    steps: [
      { label: "Seat map on the booking page", kind: "io" },
      { label: "Detect the seating layout", kind: "code" },
      { label: "No model needed", kind: "ai" },
      { label: "Three.js estimated view", kind: "code" },
      { label: "Labelled as an estimate", kind: "guard" },
    ],
    takeaway: "Knowing when not to use AI: geometry already answers the question.",
  },
];
