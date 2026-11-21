import { portfolio } from "@/content/portfolio";

export const destinations = [
  {
    id: "about",
    name: "About Me",
    subtitle: "The welcome house",
    color: "#cb7551",
    x: -17,
    z: -14,
    number: "01",
    greeting: "Welcome to the house. Let’s get to know Pradyumna and what he is building.",
    prompts: ["Who is Pradyumna?", "What is his current focus?"],
  },
  {
    id: "experience",
    name: "Experience",
    subtitle: "The professional office",
    color: "#678c99",
    x: 17,
    z: -14,
    number: "02",
    greeting: "Come in. I look after the career records, including his work at TCS and EY.",
    prompts: ["What did Pradyumna work on at TCS?", "Tell me about his roles at EY."],
  },
  {
    id: "projects",
    name: "Projects",
    subtitle: "The product lab",
    color: "#719871",
    x: -17,
    z: 0,
    number: "03",
    greeting:
      "You found the product lab. Pick a project and we’ll explore the problem, the build, and the decisions.",
    prompts: ["What problem does SeatPeekr solve?", "How does AI Finance Tracker work?"],
  },
  {
    id: "thinking",
    name: "Systems Thinking",
    subtitle: "The research studio",
    color: "#a390b5",
    x: 17,
    z: 0,
    number: "04",
    greeting: "Welcome to the studio. We start with the workflow, then decide where AI belongs.",
    prompts: ["How does he approach RAG and agent workflows?", "How does he evaluate AI systems?"],
  },
  {
    id: "skills",
    name: "Skills / Toolkit",
    subtitle: "The technical workshop",
    color: "#b59b59",
    x: -17,
    z: 14,
    number: "05",
    greeting:
      "The workshop is open. These are the tools already published in Pradyumna’s portfolio.",
    prompts: ["Which tools does he use for AI applications?", "Which frontend tools are listed?"],
  },
  {
    id: "contact",
    name: "Contact",
    subtitle: "The connection lounge",
    color: "#608f83",
    x: 17,
    z: 14,
    number: "06",
    greeting:
      "Let’s connect. I can point you to the public email, GitHub, and LinkedIn in the portfolio.",
    prompts: ["How can I contact Pradyumna?", "Where can I find his GitHub?"],
  },
] as const;
export type Section = (typeof destinations)[number]["id"];
export type Character = "explorer" | "robot" | "astronaut";
export type Phase =
  | "loading"
  | "selection"
  | "arrival"
  | "outdoor"
  | "driving"
  | "transition"
  | "indoor"
  | "chat"
  | "agent-walk"
  | "computer";
export type Point = { x: number; z: number };
export type Box = Point & { w: number; d: number };
export type Engine = {
  player: Point & { y: number; yaw: number; vy: number; vx: number; vz: number };
  car: Point & { yaw: number; speed: number };
  cameraYaw: number;
  cameraPitch: number;
  moving: number;
  clock: number;
  agentProgress: number;
  reduced: boolean;
  phase: Phase;
  approach: Point | null;
  boarding: boolean;
  agentReturning: boolean;
  jumpQueued: boolean;
  agentMood: "sleepy" | "awake" | "thinking" | "speaking";
};
export const initialEngine = (): Engine => ({
  player: { x: 0, z: 5, y: 0, yaw: Math.PI, vy: 0, vx: 0, vz: 0 },
  car: { x: 5, z: 7, yaw: Math.PI, speed: 0 },
  cameraYaw: 0,
  cameraPitch: 0.48,
  moving: 0,
  clock: 0,
  agentProgress: 0,
  reduced: false,
  phase: "loading",
  approach: null,
  boarding: false,
  agentReturning: false,
  jumpQueued: false,
  agentMood: "sleepy",
});
export const getDestination = (id: Section) => destinations.find((d) => d.id === id)!;
export const entrance = (id: Section): Point => {
  const d = getDestination(id);
  return { x: d.x + (d.x < 0 ? 5.6 : -5.6), z: d.z };
};
export const trees: Point[] = [
  { x: -25, z: -21 },
  { x: -8, z: -22 },
  { x: 8, z: -22 },
  { x: 25, z: -21 },
  { x: -25, z: 21 },
  { x: -8, z: 22 },
  { x: 8, z: 22 },
  { x: 25, z: 21 },
  { x: -25, z: -7 },
  { x: 25, z: 7 },
  { x: -8, z: 7 },
  { x: 8, z: -7 },
];
export const outdoorBoxes: Box[] = [
  ...destinations.map((d) => ({ x: d.x, z: d.z, w: 9, d: 9 })),
  ...trees.map((t) => ({ ...t, w: 0.8, d: 0.8 })),
  { x: 0, z: 0, w: 3.4, d: 3.4 },
];
export const indoorBoxes: Box[] = [
  { x: 0, z: -3, w: 6, d: 1.8 },
  { x: -5.8, z: -3, w: 1.4, d: 5 },
  { x: 5.8, z: -3, w: 1.4, d: 5 },
  { x: -4.5, z: 2, w: 2, d: 1.5 },
];
/** The guide stands behind the desk, rounds its right edge, then points from beside the display. */
export function agentPosition(progress: number): Point {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.12) return { x: -2, z: -4 - (0.6 * p) / 0.12 };
  if (p < 0.57) return { x: -2 + (5.7 * (p - 0.12)) / 0.45, z: -4.6 };
  if (p < 0.8) return { x: 3.7, z: -4.6 + (3.1 * (p - 0.57)) / 0.23 };
  return { x: 3.7 - (4.15 * (p - 0.8)) / 0.2, z: -1.5 };
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function isBlocked(p: Point, boxes: Box[], radius: number, limit: number) {
  return (
    Math.abs(p.x) > limit - radius ||
    Math.abs(p.z) > limit - radius ||
    boxes.some(
      (b) => Math.abs(p.x - b.x) < b.w / 2 + radius && Math.abs(p.z - b.z) < b.d / 2 + radius,
    )
  );
}
export function slideMove(
  p: Point,
  dx: number,
  dz: number,
  boxes: Box[],
  radius: number,
  limit: number,
): Point {
  // Substeps prevent tunneling at low frame rates; independent axes slide along walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
  let { x, z } = p;
  for (let i = 0; i < steps; i++) {
    if (!isBlocked({ x: x + dx / steps, z }, boxes, radius, limit)) x += dx / steps;
    if (!isBlocked({ x, z: z + dz / steps }, boxes, radius, limit)) z += dz / steps;
  }
  return { x, z };
}
export function safeCarExit(car: Engine["car"]): Point | null {
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const p = {
      x: car.x + Math.sin(car.yaw + angle) * 2.4,
      z: car.z + Math.cos(car.yaw + angle) * 2.4,
    };
    if (!isBlocked(p, outdoorBoxes, 0.4, 27)) return p;
  }
  return null;
}
export function parseSave(
  raw: string | null,
): { character: Character; completed: Section[] } | null {
  try {
    const v = JSON.parse(raw ?? "null");
    if (!v || !["explorer", "robot", "astronaut"].includes(v.character)) return null;
    return {
      character: v.character,
      completed: Array.isArray(v.completed)
        ? [
            ...new Set<Section>(
              v.completed.filter((id: Section) => destinations.some((d) => d.id === id)),
            ),
          ]
        : [],
    };
  } catch {
    return null;
  }
}
export const STORAGE_KEY = "pa-campus-v1";
export function sectionContext(section?: Section, projectSlug?: string): string {
  const project = portfolio.projects.find((p) => p.slug === projectSlug);
  switch (section) {
    case "about":
      return `${portfolio.person.name}. ${portfolio.person.role}. ${portfolio.person.location}. ${portfolio.thesis} ${portfolio.now.title} ${portfolio.now.body}`;
    case "experience":
      return portfolio.experience
        .map((e) => `${e.company}: ${e.role} (${e.period}). ${e.detail}`)
        .join("\n");
    case "projects":
      return (project ? [project] : portfolio.projects)
        .map(
          (p) =>
            `${p.name}: ${p.summary}\nProblem: ${p.problem}\nApproach: ${p.approach}\nDecisions: ${p.decisions.join("; ")}\nTechnology: ${p.technologies.join(", ")}\nNext: ${p.next}\nLinks: ${p.links.map((l) => `${l.label}: ${l.href}`).join(", ")}`,
        )
        .join("\n\n");
    case "thinking":
      return `${portfolio.thinking.map((t) => `${t.title}: ${t.body}`).join("\n")}\n${portfolio.principles.map((p) => `${p.title}: ${p.body}`).join("\n")}\n${portfolio.thinkingStatus}`;
    case "skills":
      return `Published toolkit: ${portfolio.toolkit.join(", ")}. Project technologies: ${[...new Set(portfolio.projects.flatMap((p) => p.technologies))].join(", ")}.`;
    case "contact":
      return `Public email: ${portfolio.person.email}. GitHub: https://github.com/${portfolio.person.github}. LinkedIn: ${portfolio.person.linkedin}. Location: ${portfolio.person.location}.`;
    default:
      return destinations.map((d) => sectionContext(d.id)).join("\n\n");
  }
}
export function sectionAnswer(question: string, section?: Section, projectSlug?: string) {
  const q = question.toLowerCase();
  if (
    /\b(password|secret|api key|salary|phone|education|degree|certification|resume|résumé)\b/.test(
      q,
    )
  )
    return "That information is not published in this portfolio. I can help with the documented work, experience, toolkit, and public contact links.";
  const project = portfolio.projects.find(
    (p) => q.includes(p.name.toLowerCase()) || q.includes(p.slug.replaceAll("-", " ")),
  );
  if (project) {
    if (/problem|solve/.test(q)) return `${project.summary}\n\n${project.problem}`;
    if (/how|approach|work/.test(q))
      return `${project.approach}\n\n${project.decisions.join("\n")}`;
    if (/stack|technolog|tools/.test(q))
      return `${project.name} uses ${project.technologies.join(", ")}.`;
    if (/next|improv/.test(q)) return project.next;
    return `${project.summary}\n\nTechnology: ${project.technologies.join(", ")}.`;
  }
  if (/\b(tcs|tata)\b/.test(q)) {
    const e = portfolio.experience[0];
    return `${e.role} at ${e.company} (${e.period}). ${e.detail}`;
  }
  if (/\b(ey|ernst)\b/.test(q))
    return portfolio.experience
      .slice(1)
      .map((e) => `${e.role} at ${e.company} (${e.period}). ${e.detail}`)
      .join("\n\n");
  if (/evaluat/.test(q) && section !== "projects") return portfolio.principles[4].body;
  if (/rag|retriev|agent|trust/.test(q) && section !== "projects")
    return portfolio.thinking
      .filter(
        (t) =>
          (/rag|retriev|trust/.test(q) && t.title === "Retrieval and trust") ||
          (/agent/.test(q) && t.title === "Agentic orchestration"),
      )
      .map((t) => `${t.title}: ${t.body}`)
      .join("\n\n");
  if (/approach/.test(q) && section !== "projects")
    return portfolio.principles.map((p) => `${p.title}: ${p.body}`).join("\n\n");
  if (/contact|email|github|linkedin/.test(q)) return sectionContext("contact");
  if (/tools|toolkit|skill|frontend|technolog/.test(q)) return sectionContext("skills");
  if (/who|focus|about|background|direction/.test(q)) return sectionContext("about");
  if (/experience|career|company|companies|roles/.test(q)) return sectionContext("experience");
  if (/work|project|solve|build|problem|stack|decision|next|how/.test(q))
    return sectionContext(section ?? "projects", projectSlug);
  return "I don’t have a documented answer to that specific question. Open the section on the computer to see all the published information, or choose one of the suggested questions.";
}
