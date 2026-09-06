import { portfolio } from "@/content/portfolio";

export function getPortfolioContext() {
  const projects = portfolio.projects
    .map(
      (project) => `${project.name} (${project.year}, ${project.status})\nSummary: ${project.summary}\nProblem: ${project.problem}\nApproach: ${project.approach}\nDecisions: ${project.decisions.join("; ")}\nTechnology: ${project.technologies.join(", ")}\nNext: ${project.next}`,
    )
    .join("\n\n");

  return `Portfolio for ${portfolio.person.name}
Role: ${portfolio.person.role}
Location: ${portfolio.person.location}
Professional thesis: ${portfolio.thesis}
Current direction: ${portfolio.now.title}. ${portfolio.now.body}

Experience:
${portfolio.experience.map((item) => `${item.role}, ${item.company} (${item.period}): ${item.detail}`).join("\n")}

Projects:
${projects}`;
}

/** A useful zero-configuration responder for the portfolio assistant. */
export function getLocalPortfolioAnswer(question: string) {
  const normalized = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const has = (...terms: string[]) => terms.some((term) => normalized.includes(term));

  if (has("email", "e mail", "phone", "mobile", "address", "home", "password", "secret", "api key", "token", "private", "personal contact", "contact", "salary", "income", "credential") || /[^\s@]+@[^\s@]+\.[^\s@]+|\+?\d[\d\s().-]{7,}\d/.test(question)) {
    return "I can only answer questions about the public information published on this portfolio. I can’t share private or personal details.";
  }

  if (has("experience", "past work", "pastw", "career", "company", "companies", "worked")) {
    return `${portfolio.person.name}'s published experience includes: ${portfolio.experience
      .map((item) => `${item.role} at ${item.company} (${item.period}) — ${item.detail}`)
      .join(" ")}`;
  }

  const matchingProject = portfolio.projects.find((project) =>
    normalized.includes(project.name.toLowerCase()),
  );

  if (matchingProject) {
    return `${matchingProject.name}: ${matchingProject.summary} It uses ${matchingProject.technologies.join(", ")}.${matchingProject.links.map((link) => ` ${link.label}: ${link.href}`).join("")}`;
  }

  if (has("project", "projects", "work", "finance tracker", "finance")) {
    return `Featured projects include ${portfolio.projects
      .map(
        (project) => `${project.name}: ${project.summary} It uses ${project.technologies.join(", ")}.`,
      )
      .join(" ")}`;
  }

  if (has("skill", "skills", "technology", "technologies", "stack", "capability", "rag", "agent")) {
    return `Published technical toolkit: ${portfolio.toolkit.join(", ")}.`;
  }

  if (has("role", "current", "who", "about", "pradyumna")) {
    return `${portfolio.person.name} is a ${portfolio.person.role}, based in ${portfolio.person.location}. ${portfolio.now.body}`;
  }

  return "I can help with Pradyumna's experience, SeatPeekr and AI Finance Tracker projects, skills, or approach to reliable AI systems. Try: ‘What is SeatPeekr?’";
}
