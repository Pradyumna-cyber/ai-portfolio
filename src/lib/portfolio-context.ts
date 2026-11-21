import { sectionAnswer, sectionContext, type Section } from "@/components/world/model";

export function getPortfolioContext(section?: Section, project?: string) {
  return sectionContext(section, project);
}
/** Published-content lookup; intentionally does not pretend to be a live model. */
export function getLocalPortfolioAnswer(question: string, section?: Section, project?: string) {
  return sectionAnswer(question, section, project);
}
