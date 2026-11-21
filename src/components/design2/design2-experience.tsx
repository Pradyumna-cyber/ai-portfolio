"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { portfolio } from "@/content/portfolio";
import { useDeviceProfile } from "@/experiences/shared/device";
import { AI_BUILDS } from "./ai-builds";
import { SoundEngine, saveSoundPreference, soundPreference } from "./sound";
import { CHAPTERS, HOME, chapterTime, type Chapter } from "./timeline";
import "./design2.css";

const noopSubscribe = () => () => {};

const Design2Scene = dynamic(() => import("./scene"), { ssr: false });

const LABELS: Record<Chapter, string> = {
  hero: "Operator",
  dive: "Link",
  about: "About",
  projects: "Projects",
  build: "AI builds",
  experience: "Experience",
  beliefs: "Beliefs",
  toolkit: "Toolkit",
  contact: "Contact",
};

/**
 * Design 2: a man in a VR headset; scrolling dives through the visor into a holographic
 * Earth where each section of the portfolio is a chapter. Content is plain HTML.
 */
export function Design2Experience() {
  const device = useDeviceProfile();
  const progress = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);
  const sound = useRef<SoundEngine | null>(null);
  // Saved preference, hydration-safe (server assumes "on"); a click overrides it.
  const savedSound = useSyncExternalStore(noopSubscribe, soundPreference, () => true);
  const [soundChoice, setSoundChoice] = useState<boolean | null>(null);
  const soundOn = soundChoice ?? savedSound;
  const [soundLive, setSoundLive] = useState(false);
  /** Chapter whose content is revealed: only once the glide has settled on it (−1 in transit). */
  const [reveal, setReveal] = useState(0);

  // Sound: start right away if the browser allows it, otherwise on the first click/tap/key.
  useEffect(() => {
    const engine = new SoundEngine();
    sound.current = engine;
    const pref = soundPreference();
    engine.enabled = pref;
    const unlock = () => {
      if (!engine.enabled) return;
      void engine.unlock().then((ok) => {
        if (ok) {
          setSoundLive(true);
          remove();
        }
      });
    };
    const remove = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchend", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchend", unlock);
    if (pref)
      void engine.tryStart().then((ok) => {
        if (ok) {
          setSoundLive(true);
          remove();
        }
      });
    return () => {
      remove();
      engine.dispose();
      sound.current = null;
    };
  }, []);

  // Click on every chapter change (not on the first render).
  const lastChapter = useRef(0);
  useEffect(() => {
    if (active !== lastChapter.current) sound.current?.tick();
    lastChapter.current = active;
  }, [active]);

  const toggleSound = () => {
    const engine = sound.current;
    if (!engine) return;
    const next = !soundOn;
    setSoundChoice(next);
    saveSoundPreference(next);
    engine.setEnabled(next);
    if (next)
      void engine.unlock().then((ok) => {
        setSoundLive(ok);
        if (ok) engine.tick();
      });
  };

  // One chapter per gesture: a wheel gesture, swipe or key press moves exactly one section.
  useEffect(() => paginate(root.current), []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const els = root.current?.querySelectorAll<HTMLElement>(".d2-section") ?? [];
      const tops = Array.from(els, (el) => el.offsetTop);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = chapterTime(tops, window.scrollY, max);
      progress.current = t;
      setActive(Math.round(t));
      setReveal(Math.abs(t - Math.round(t)) < 0.06 ? Math.round(t) : -1);
      setPct(Math.round((t / (CHAPTERS.length - 1)) * 100));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // Reveal animations: only the chapter in view is "active"; the others rest faded out.
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".d2-section") ?? [];
    els.forEach((el, i) => el.classList.toggle("is-active", i === reveal));
  }, [reveal]);

  const { person } = portfolio;
  const inside = active >= 2;

  return (
    <div className="d2-root" ref={root} data-inside={inside || undefined}>
      {device?.webgl && (
        <div className="d2-stage" aria-hidden>
          <Design2Scene target={progress} flash={flash} device={device} />
        </div>
      )}
      <div className="d2-tint" aria-hidden />
      <div className="d2-flash" ref={flash} aria-hidden />
      <div className="d2-frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>

      <nav className="d2-rail" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a
            key={c}
            href={`#${c}`}
            aria-current={active === i ? "step" : undefined}
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("d2-goto", { detail: i }));
            }}
          >
            <span className="d2-rail-n">{String(i).padStart(2, "0")}</span>
            <span className="d2-rail-l">{LABELS[c]}</span>
          </a>
        ))}
      </nav>

      <button
        type="button"
        className="d2-sound"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute sound" : "Turn sound on"}
        data-live={(soundOn && soundLive) || undefined}
      >
        <span className="d2-sound-bars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>{soundOn ? (soundLive ? "Sound on" : "Tap for sound") : "Sound off"}</span>
      </button>

      <div className="d2-readout" aria-hidden>
        <span>
          {HOME.lat.toFixed(2)}°N {HOME.lon.toFixed(2)}°E
        </span>
        <span>{person.location.toUpperCase()}</span>
        <span className="d2-bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      </div>

      <main id="main">
        <section id="hero" className="d2-section d2-hero">
          <div className="d2-hero-name">
            <p className="d2-eyebrow">Hey, I’m</p>
            <h1>
              {person.name.split(" ")[0]}
              <br />
              <span>{person.name.split(" ").slice(1).join(" ")}</span>
            </h1>
          </div>
          <div className="d2-hero-side">
            <p className="d2-eyebrow">{person.identity}</p>
            <p>{portfolio.thesis}</p>
          </div>
          <p className="d2-cue" aria-hidden>
            Scroll to put the headset on ↓
          </p>
        </section>

        <section id="dive" className="d2-section d2-dive">
          <p className="d2-eyebrow">Establishing link</p>
          <p className="d2-dive-title">Entering my world</p>
        </section>

        <section id="about" className="d2-section" data-align="left">
          <div className="d2-panel">
            <p className="d2-eyebrow">01 · About me</p>
            <h2>{portfolio.now.title}</h2>
            <p>{person.role}.</p>
            <p>{portfolio.now.body}</p>
          </div>
        </section>

        <section id="projects" className="d2-section" data-align="bottom">
          <div className="d2-cards">
            {portfolio.projects.map((p, i) => (
              <article key={p.slug} className="d2-panel">
                <p className="d2-eyebrow">
                  02.{i + 1} · {p.status} · {p.year}
                </p>
                <h2>{p.name}</h2>
                <p>{p.summary}</p>
                <ul className="d2-chips">
                  {p.technologies.slice(0, 5).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="d2-links">
                  <Link href={`/work/${p.slug}`}>Case study</Link>
                  {p.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="build" className="d2-section" data-align="left">
          <div className="d2-build">
            <p className="d2-eyebrow">03 · How I build with AI</p>
            <h2>AI where it changes the outcome.</h2>
            <p className="d2-build-lede">Plain, testable code everywhere else.</p>
            <ol className="d2-legend" aria-label="Legend">
              <li data-kind="ai">Model</li>
              <li data-kind="code">Code</li>
              <li data-kind="guard">Guardrail</li>
            </ol>
            {AI_BUILDS.map((b) => (
              <article key={b.name} className="d2-flow">
                <Link href={b.href} className="d2-flow-name">
                  {b.name} <span aria-hidden>→</span>
                </Link>
                <ol>
                  {b.steps.map((st) => (
                    <li key={st.label} data-kind={st.kind}>
                      {st.label}
                    </li>
                  ))}
                </ol>
                <p>{b.takeaway}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="experience" className="d2-section" data-align="right">
          <div className="d2-panel">
            <p className="d2-eyebrow">04 · Experience</p>
            <h2>Orbits I’ve worked in</h2>
            <ol className="d2-list">
              {portfolio.experience.map((e, i) => (
                <li key={`${e.company}-${e.role}`} data-current={i === 0 || undefined}>
                  <strong>{e.role}</strong>
                  <span>
                    {e.company} · {e.period}
                  </span>
                  <p>{e.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="beliefs" className="d2-section" data-align="left">
          <div className="d2-panel">
            <p className="d2-eyebrow">05 · Beliefs</p>
            <h2>What I believe about building with AI</h2>
            <ol className="d2-steps">
              {portfolio.principles.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}</strong>
                  <p>{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="toolkit" className="d2-section" data-align="right">
          <div className="d2-panel d2-toolkit">
            <p className="d2-eyebrow">06 · Toolkit</p>
            <h2>What I build with</h2>
            <ol className="d2-tools">
              {portfolio.toolkit.map((tool, i) => {
                const usedIn = portfolio.projects
                  .filter((p) => p.technologies.some((t) => t.toLowerCase() === tool.toLowerCase()))
                  .map((p) => p.name);
                return (
                  <li key={tool} style={{ "--i": i } as React.CSSProperties}>
                    <span className="d2-tool-n">{String(i + 1).padStart(2, "0")}</span>
                    <strong>{tool}</strong>
                    {usedIn.length > 0 && <span className="d2-tool-use">{usedIn.join(" · ")}</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="contact" className="d2-section d2-contact">
          <div>
            <p className="d2-eyebrow">07 · Signal from {person.location}</p>
            <h2>Let’s build something useful.</h2>
            <p className="d2-links">
              <a href={`mailto:${person.email}`}>{person.email}</a>
              <a href={person.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
              <a href={`https://github.com/${person.github}`} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </p>
            <p className="d2-credits">
              Head scan: Lee Perry-Smith / Infinite Realities (CC BY 3.0) · Earth textures: Solar
              System Scope (CC BY 4.0) · Type: Silkscreen (OFL)
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Section paging. Every `.d2-section` is exactly one viewport tall, so each gesture glides
 * to the next/previous chapter; momentum from the same gesture is swallowed so it can't
 * skip ahead. A panel with more content than fits scrolls inside its own box first (the
 * page stays on that chapter), then the next gesture pages on. Returns a cleanup function.
 */
const SCROLLER = ".d2-panel, .d2-build, .d2-cards";

/** The panel under `node` that can still scroll in `dir`, if any. */
function innerScroller(node: EventTarget | null, dir: 1 | -1) {
  const el = node instanceof Element ? node.closest<HTMLElement>(SCROLLER) : null;
  if (!el || el.scrollHeight <= el.clientHeight + 1) return null;
  const room = dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 1;
  return room ? el : null;
}

function paginate(root: HTMLElement | null) {
  if (!root) return;
  // The site sets `scroll-behavior: smooth` globally; it would fight the per-frame glide.
  const html = document.documentElement;
  html.classList.add("d2-page");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = () => Array.from(root.querySelectorAll<HTMLElement>(".d2-section"));
  let target: number | null = null;
  let lastInput = 0;

  const current = () => {
    const list = sections();
    let i = 0;
    let best = Infinity;
    list.forEach((el, k) => {
      const d = Math.abs(el.offsetTop - window.scrollY);
      if (d < best) {
        best = d;
        i = k;
      }
    });
    return { i, list };
  };
  /** Custom eased glide (easeInOutCubic): same feel on every browser, length scales with distance. */
  let raf = 0;
  const glideTo = (top: number) => {
    target = top;
    cancelAnimationFrame(raf);
    const from = window.scrollY;
    const dist = top - from;
    if (reduce || Math.abs(dist) < 2) {
      window.scrollTo(0, top);
      return;
    }
    const dur = Math.min(1500, 850 + Math.abs(dist) * 0.12);
    const start = performance.now();
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      window.scrollTo(0, from + dist * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const go = (dir: 1 | -1) => {
    const { i, list } = current();
    const next = Math.min(list.length - 1, Math.max(0, i + dir));
    glideTo(list[next].offsetTop);
  };
  /** Chapter rail clicks jump straight to a chapter with the same glide. */
  const onGoto = (e: Event) => {
    const i = (e as CustomEvent<number>).detail;
    const el = sections()[i];
    if (el) {
      lastInput = performance.now();
      glideTo(el.offsetTop);
    }
  };
  /** `quiet` = ms since the previous input event of the gesture. */
  const busy = (quiet: number) => {
    if (target === null) return false;
    const arrived = Math.abs(window.scrollY - target) < 2;
    // Stay locked until the glide has finished *and* the gesture's momentum has died out.
    if (arrived && quiet > 220) target = null;
    return target !== null;
  };
  /** Records an input event and returns the ms since the previous one. */
  const input = () => {
    const now = performance.now();
    const quiet = now - lastInput;
    lastInput = now;
    return quiet;
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom
    const dir = e.deltaY > 0 ? 1 : -1;
    const quiet = input();
    if (busy(quiet)) {
      e.preventDefault();
      return;
    }
    if (innerScroller(e.target, dir)) return; // let the panel scroll natively
    e.preventDefault();
    if (Math.abs(e.deltaY) < 4) return;
    go(dir);
  };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && /input|textarea|select/i.test(t.tagName)) return;
    const down = ["ArrowDown", "PageDown", " "].includes(e.key) && !e.shiftKey;
    const up = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (!down && !up) return;
    const dir = down ? 1 : -1;
    if (innerScroller(t, dir)) return;
    e.preventDefault();
    if (!busy(input())) go(dir);
  };
  let touchY: number | null = null;
  let touchTarget: EventTarget | null = null;
  let panelHadRoom = false;
  const onTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0]?.clientY ?? null;
    touchTarget = e.target;
    panelHadRoom = false;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (touchY === null) return;
    const dy = touchY - (e.touches[0]?.clientY ?? touchY);
    const dir = dy > 0 ? 1 : -1;
    if (innerScroller(touchTarget, dir)) {
      panelHadRoom = true; // this swipe scrolls the panel, not the page
      return;
    }
    e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchY === null) return;
    const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
    touchY = null;
    const dir = dy > 0 ? 1 : -1;
    if (panelHadRoom || Math.abs(dy) < 40) return;
    if (!busy(input())) go(dir);
  };
  // Keep the current chapter aligned when the window is resized (section heights change).
  const onResize = () => {
    const { i, list } = current();
    window.scrollTo({ top: list[i].offsetTop });
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("resize", onResize);
  window.addEventListener("d2-goto", onGoto);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("d2-goto", onGoto);
    html.classList.remove("d2-page");
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("resize", onResize);
  };
}
