"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { portfolio } from "@/content/portfolio";
import { OS_FOLDERS, STARTER_PROMPTS, type FolderId } from "./os-content";

type Msg = { role: "user" | "assistant"; content: string; mode?: "live" | "lookup" };

/** The "operating system" shown on the monitor once the camera has zoomed in. */
export function DeskOS({ onExit, reducedMotion }: { onExit: () => void; reducedMotion: boolean }) {
  const [open, setOpen] = useState<FolderId | null>(null);
  const folder = OS_FOLDERS.find((f) => f.id === open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) setOpen(null);
      else onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onExit]);

  return (
    <div className="os">
      <div className="os-grid" aria-hidden="true" />
      <div className="os-glow" aria-hidden="true" />

      <header className="os-bar">
        <span className="os-logo">PA/OS</span>
        <span className="os-mono os-dim">[ v2026.11 ]</span>
        <Clock />
        <button type="button" className="os-exit" onClick={onExit}>
          ⎋ Back to desk
        </button>
      </header>

      <main className="os-main">
        <section className="os-hero">
          <p className="os-mono os-dim">[ {portfolio.person.identity.toUpperCase()} ]</p>
          <h1>
            Pradyumna
            <br />
            Aher
          </h1>
          <p className="os-thesis">{portfolio.thesis}</p>
        </section>

        <Orb reducedMotion={reducedMotion} />

        <nav className="os-folders" aria-label="Portfolio folders">
          {OS_FOLDERS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className="os-folder"
              aria-pressed={open === f.id}
              onClick={() => setOpen(f.id)}
            >
              <span className="os-folder-icon" aria-hidden="true" />
              <span className="os-folder-name">{f.name}</span>
              <span className="os-mono os-dim os-folder-idx">0{i + 1}</span>
            </button>
          ))}
        </nav>
      </main>

      {folder && (
        <div className="os-window" role="dialog" aria-label={folder.name}>
          <div className="os-window-bar">
            <button
              type="button"
              className="os-dot os-dot-close"
              onClick={() => setOpen(null)}
              aria-label="Close window"
            />
            <span className="os-dot" />
            <span className="os-dot" />
            <span className="os-mono os-dim">{folder.path}</span>
          </div>
          <div className="os-window-body">
            <FolderBody id={folder.id} />
          </div>
        </div>
      )}

      <Chat />
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="os-mono os-clock">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

/** Amber particle sphere, drawn on a 2D canvas (cheap, no second WebGL context). */
function Orb({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const n = 1100;
    const pts = Array.from({ length: n }, (_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return [Math.cos(th) * r, y, Math.sin(th) * r, Math.random()] as const;
    });
    let raf = 0;
    const draw = (t: number) => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.38;
      const a = t * 0.00012;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      for (const [x, y, z, j] of pts) {
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        const breathe = 1 + Math.sin(t * 0.0012 + j * 6) * 0.015;
        const depth = (rz + 1) / 2;
        ctx.fillStyle = `rgba(255,${170 + j * 70},${90 + j * 80},${0.15 + depth * 0.85})`;
        const s = 0.8 + depth * 1.6;
        ctx.fillRect(w / 2 + rx * R * breathe, h / 2 + y * R * breathe, s, s);
      }
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);
  return <canvas ref={ref} className="os-orb" aria-hidden="true" />;
}

function FolderBody({ id }: { id: FolderId }) {
  switch (id) {
    case "about":
      return (
        <div className="os-stack">
          <p className="os-lead">{portfolio.thesis}</p>
          <p>{portfolio.person.role}.</p>
          <p>{portfolio.now.body}</p>
          <p className="os-mono os-dim">
            {portfolio.person.location} · <Link href="/standard">standard portfolio ↗</Link>
          </p>
        </div>
      );
    case "projects":
      return (
        <div className="os-stack">
          {portfolio.projects.map((p) => (
            <article key={p.slug} className="os-card">
              <span className="os-tag">
                [ {p.status} · {p.year} ]
              </span>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <p className="os-dim">{p.technologies.join(" · ")}</p>
              <div className="os-links">
                <Link href={`/work/${p.slug}`}>Case study →</Link>
                {p.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    case "experience":
      return (
        <div className="os-stack">
          {portfolio.experience.map((e) => (
            <article key={e.role + e.period} className="os-card">
              <span className="os-tag">[ {e.period} ]</span>
              <h3>
                {e.role} · {e.company}
              </h3>
              <p>{e.detail}</p>
            </article>
          ))}
        </div>
      );
    case "thinking":
      return (
        <ol className="os-steps">
          {portfolio.principles.map((p) => (
            <li key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      );
    case "toolkit":
      return (
        <ul className="os-chips">
          {portfolio.toolkit.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <div className="os-stack">
          <p className="os-lead">Have a messy problem worth thinking through? Let&apos;s talk.</p>
          <div className="os-links">
            <a href={`mailto:${portfolio.person.email}`}>{portfolio.person.email}</a>
            <a href={portfolio.person.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
            <a
              href={`https://github.com/${portfolio.person.github}`}
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      );
  }
}

/** P’AI chat dock, backed by the existing /api/portfolio-assistant route. */
function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/portfolio-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = (await res.json()) as { answer?: string; mode?: "live" | "lookup" };
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer ?? "Sorry, I couldn't answer that.",
          mode: data.mode,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "P’AI is offline right now. Try the folders above.",
          mode: "lookup",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <section className="os-chat" aria-label="Ask P’AI">
      {messages.length > 0 ? (
        <div className="os-log" ref={log} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`os-msg os-msg-${m.role}`}>
              {m.role === "assistant" && (
                <span className="os-mono os-dim os-msg-src">
                  [ P’AI · {m.mode === "live" ? "live AI" : "from portfolio"} ]
                </span>
              )}
              <p>{m.content}</p>
            </div>
          ))}
          {busy && <div className="os-msg os-msg-assistant os-typing">thinking…</div>}
        </div>
      ) : (
        <div className="os-starters">
          {STARTER_PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => void ask(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      <form className="os-input" onSubmit={submit}>
        <span className="os-input-dot" aria-hidden="true" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask P’AI anything about Pradyumna…"
          maxLength={600}
          aria-label="Ask P’AI a question"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Ask ↵
        </button>
      </form>
    </section>
  );
}
