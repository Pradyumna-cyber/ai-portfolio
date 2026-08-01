import { Cpu } from "lucide-react";

export function SkillsMarquee({ skills }: { skills: string[] }) {
  const items = (hidden = false) => (
    <div className="marquee-track-group" aria-hidden={hidden || undefined}>
      {skills.map((skill) => (
        <span className="marquee-skill" key={`${hidden ? "copy" : "main"}-${skill}`}>
          <Cpu size={13} aria-hidden="true" /> {skill}
        </span>
      ))}
    </div>
  );

  return (
    <section className="skills-marquee-section" aria-label="Core technical toolkit">
      <div className="shell skills-marquee-heading">
        <p className="eyebrow">Core toolkit</p>
        <p>Tools I use to move from product workflow to reliable AI capability.</p>
      </div>
      <div className="skills-marquee" role="presentation">
        <div className="marquee-track">
          {items()}
          {items(true)}
        </div>
      </div>
    </section>
  );
}
