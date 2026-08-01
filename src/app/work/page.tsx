import { ProjectExplorer } from "@/components/project-explorer";
import { portfolio } from "@/content/portfolio";

export const metadata = {
  title: "Selected Work",
  description: "AI and software projects by Pradyumna Aher.",
};

export default function WorkPage() {
  return (
    <div id="main" className="shell page-space">
      <p className="eyebrow">Selected work</p>
      <h1 className="page-title">Engineering records, not gallery cards.</h1>
      <p className="page-intro">
        Each entry frames the product need, the implementation approach, and the next technical
        questions.
      </p>
      <div className="mt-12">
        <ProjectExplorer projects={portfolio.projects} />
      </div>
    </div>
  );
}
