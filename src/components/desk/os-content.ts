/** Folders on the PA/OS desktop. Order = order on screen. */
export const OS_FOLDERS = [
  { id: "about", name: "About me", path: "~/about-me" },
  { id: "projects", name: "Projects", path: "~/projects" },
  { id: "experience", name: "Experience", path: "~/experience" },
  { id: "thinking", name: "How I think", path: "~/how-i-think" },
  { id: "toolkit", name: "Toolkit", path: "~/toolkit" },
  { id: "contact", name: "Contact", path: "~/contact" },
] as const;

export type FolderId = (typeof OS_FOLDERS)[number]["id"];

/** Suggested questions shown above the P’AI chat input before the first message. */
// TODO(human): Pick 3 starter questions that show you off best AND get a good answer
// even without an OpenAI key (keyword lookup in sectionAnswer, src/components/world/model.ts).
export const STARTER_PROMPTS: string[] = [
  "What has Pradyumna built?",
  "How does he approach an AI problem?",
  "What is his experience?",
];
