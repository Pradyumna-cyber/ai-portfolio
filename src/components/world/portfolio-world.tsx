"use client";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowLeft,
  Compass,
  RotateCcw,
  HelpCircle,
  X,
  Send,
  Monitor,
  MapPin,
  Check,
  ChevronRight,
  Settings2,
  CarFront,
} from "lucide-react";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { portfolio } from "@/content/portfolio";
import { WorldScene } from "./scene";
import { SectionContent } from "./section-content";
import {
  destinations,
  initialEngine,
  entrance,
  distance,
  safeCarExit,
  parseSave,
  STORAGE_KEY,
  getDestination,
  sectionAnswer,
  type Section,
  type Character,
  type Phase,
} from "./model";
import "./world.css";

type Message = { role: "user" | "assistant"; text: string; mode?: string };
type Nearby =
  { kind: "entry"; section: Section } | { kind: "exit" | "agent" | "computer" | "car" } | null;
const choices = [
  {
    id: "explorer" as Character,
    name: "The Explorer",
    description: "A curious mind. A new perspective.",
    tag: "CURIOUS BY NATURE",
  },
  {
    id: "robot" as Character,
    name: "The Companion",
    description: "A little logic. A lot of personality.",
    tag: "BUILT TO DISCOVER",
  },
  {
    id: "astronaut" as Character,
    name: "The Voyager",
    description: "Big ideas. New frontiers.",
    tag: "THINK BEYOND",
  },
];
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <div className="world-unavailable">
        <h2>The world needs WebGL.</h2>
        <p>
          Your browser couldn’t start the 3D scene. All portfolio content is available in the
          standard view.
        </p>
        <Link href="/standard">View standard portfolio ↗</Link>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function PortfolioWorld() {
  const engine = useRef(initialEngine()),
    keys = useRef(new Set<string>());
  const [phase, setPhase] = useState<Phase>("loading"),
    [room, setRoom] = useState<Section | null>(null),
    [character, setCharacter] = useState<Character>("explorer");
  const [completed, setCompleted] = useState<Section[]>([]),
    [target, setTarget] = useState<Section | null>(null),
    [nearby, setNearby] = useState<Nearby>(null);
  const [mapPoint, setMapPoint] = useState({
      x: 0,
      z: 5,
      yaw: Math.PI,
      carX: 5,
      carZ: 7,
      speed: 0,
      y: 0,
    }),
    [guide, setGuide] = useState(false),
    [settings, setSettings] = useState(false),
    [quality, setQuality] = useState("high"),
    [reduced, setReduced] = useState(false);
  const [project, setProject] = useState(portfolio.projects[0].slug),
    [conversations, setConversations] = useState<Partial<Record<Section, Message[]>>>({}),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [mapOpen, setMapOpen] = useState(true),
    [webgl, setWebgl] = useState(true),
    [storageReady, setStorageReady] = useState(false),
    [fade, setFade] = useState(false);
  const current = useRef({ phase, room, nearby, character, guide, settings });
  useLayoutEffect(() => {
    current.current = { phase, room, nearby, character, guide, settings };
  }, [phase, room, nearby, character, guide, settings]);
  const lock = useRef(false),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    request = useRef<AbortController | null>(null),
    chatScroll = useRef<HTMLDivElement>(null),
    modal = useRef<HTMLDivElement>(null),
    chatInput = useRef<HTMLInputElement>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);
  useEffect(() => {
    const pendingTimers = timers.current;
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      setWebgl(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(motion.matches);
      const mobile = window.matchMedia("(max-width: 760px)").matches;
      setQuality(mobile ? "low" : "high");
      try {
        const saved = parseSave(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          setCharacter(saved.character);
          setCompleted(saved.completed);
        }
      } catch {
        /* Storage can be disabled; the session remains usable. */
      }
      setStorageReady(true);
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    motion.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", update);
      pendingTimers.forEach(clearTimeout);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (storageReady)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ character, completed }));
      } catch {
        /* Private browsing may deny persistence. */
      }
  }, [character, completed, storageReady]);
  useEffect(() => {
    keys.current.clear();
    engine.current.jumpQueued = false;
    if (phase === "chat") chatInput.current?.focus();
    if (guide || settings || phase === "selection") modal.current?.focus();
  }, [phase, guide, settings]);
  useEffect(() => {
    chatScroll.current?.scrollTo({
      top: chatScroll.current.scrollHeight,
      behavior: reduced ? "instant" : "smooth",
    });
  }, [conversations, busy, reduced]);
  const notify = useCallback(
    (text: string) => {
      setNotice(text);
      later(() => setNotice(""), 3500);
    },
    [later],
  );
  const complete = useCallback((id: Section) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const transition = useCallback(
    (destination: Section | null, quick = false) => {
      if (lock.current) return;
      lock.current = true;
      request.current?.abort();
      setBusy(false);
      setInput("");
      setPhase("transition");
      keys.current.clear();
      const approachTime = !quick && !reduced ? 200 : 0;
      const e = engine.current;
      e.approach = !quick ? (destination ? entrance(destination) : { x: 0, z: 6.35 }) : null;
      if (e.approach && destination) e.approach.x += getDestination(destination).x < 0 ? -0.4 : 0.4;
      if (approachTime) later(() => setFade(true), approachTime);
      else setFade(true);
      setNearby(null);
      later(
        () => {
          const old = current.current.room;
          setRoom(destination);
          const e = engine.current;
          e.approach = null;
          e.agentProgress = 0;
          e.agentReturning = false;
          e.agentMood = "sleepy";
          e.player.vx = 0;
          e.player.vz = 0;
          e.player.vy = 0;
          e.player.y = 0;
          if (destination) {
            e.player.x = 0;
            e.player.z = 5.2;
            e.player.yaw = Math.PI;
            e.cameraYaw = 0;
            setTarget(destination);
          } else {
            const p = old ? entrance(old) : { x: 0, z: 5 };
            e.player.x = p.x;
            e.player.z = p.z;
            e.player.yaw = old && getDestination(old).x < 0 ? Math.PI / 2 : -Math.PI / 2;
            e.cameraYaw = 0;
          }
          later(() => {
            setFade(false);
            setPhase(destination ? "indoor" : "outdoor");
            lock.current = false;
            if (quick && destination) notify(`Arrived at ${getDestination(destination).name}.`);
          }, 100);
        },
        approachTime + (reduced ? 80 : 400),
      );
    },
    [later, reduced, notify],
  );
  const showComputer = useCallback(() => {
    if (!current.current.room || lock.current) return;
    request.current?.abort();
    setBusy(false);
    setPhase("agent-walk");
    engine.current.agentMood = "awake";
    engine.current.agentReturning = false;
    keys.current.clear();
  }, []);
  const closeInteraction = useCallback(() => {
    const c = current.current;
    if (c.guide) {
      setGuide(false);
      return;
    }
    if (c.settings) {
      setSettings(false);
      return;
    }
    if (c.phase === "chat" || c.phase === "computer") {
      if (c.phase === "computer") engine.current.agentReturning = true;
      request.current?.abort();
      setBusy(false);
      setInput("");
      setPhase("indoor");
      engine.current.agentMood = "awake";
    }
  }, []);
  const interact = useCallback(() => {
    const c = current.current;
    if (lock.current || c.guide || c.settings) return;
    if (c.phase === "driving") {
      if (Math.abs(engine.current.car.speed) > 0.3) {
        notify("Brake to a stop before leaving the car.");
        return;
      }
      const p = safeCarExit(engine.current.car);
      if (!p) {
        notify("Drive to an open space to get out.");
        return;
      }
      Object.assign(engine.current.player, p);
      engine.current.car.speed = 0;
      setPhase("outdoor");
      return;
    }
    if (c.phase !== "outdoor" && c.phase !== "indoor") return;
    if (!c.nearby) return;
    switch (c.nearby.kind) {
      case "entry":
        transition(c.nearby.section);
        break;
      case "exit":
        transition(null);
        break;
      case "car":
        engine.current.boarding = true;
        engine.current.approach = safeCarExit(engine.current.car);
        lock.current = true;
        setPhase("arrival");
        notify("Taking the driver’s seat…");
        later(
          () => {
            engine.current.boarding = false;
            engine.current.approach = null;
            setPhase("driving");
            lock.current = false;
          },
          reduced ? 50 : 450,
        );
        break;
      case "computer":
        showComputer();
        break;
      case "agent":
        if (c.room) {
          const id = c.room;
          engine.current.agentMood = "awake";
          setConversations((prev) =>
            prev[id]
              ? prev
              : { ...prev, [id]: [{ role: "assistant", text: getDestination(id).greeting }] },
          );
          setPhase("chat");
        }
        break;
    }
  }, [notify, transition, showComputer, later, reduced]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeInteraction();
        return;
      }
      const el = e.target as HTMLElement;
      if (el?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if (e.key === " " && el?.closest("button,a")) return;
      if (current.current.guide || current.current.settings) return;
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "shift",
          "e",
        ].includes(key)
      )
        e.preventDefault();
      if (key === "e") {
        if (!e.repeat) interact();
        return;
      }
      keys.current.add(key);
      if (
        key === " " &&
        !e.repeat &&
        engine.current.player.y === 0 &&
        (current.current.phase === "outdoor" || current.current.phase === "indoor")
      )
        engine.current.jumpQueued = true;
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => {
      keys.current.clear();
      drag.current = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
    };
  }, [closeInteraction, interact]);
  const tick = useCallback(() => {
    const e = engine.current,
      c = current.current;
    setMapPoint({
      x: e.player.x,
      z: e.player.z,
      yaw: e.player.yaw,
      carX: e.car.x,
      carZ: e.car.z,
      speed: e.car.speed,
      y: e.player.y,
    });
    let n: Nearby = null;
    if (c.phase === "outdoor") {
      const d = destinations.find((d) => distance(e.player, entrance(d.id)) < 2);
      if (d) n = { kind: "entry", section: d.id };
      else if (distance(e.player, e.car) < 3.6) n = { kind: "car" };
    }
    if (c.phase === "indoor") {
      if (distance(e.player, { x: 0, z: 6 }) < 1.8) n = { kind: "exit" };
      else if (distance(e.player, { x: 2, z: -1.8 }) < 1.9) n = { kind: "computer" };
      else if (distance(e.player, { x: -2, z: -1.8 }) < 2.6) n = { kind: "agent" };
    }
    setNearby((prev) => (JSON.stringify(prev) === JSON.stringify(n) ? prev : n));
  }, []);
  const send = async (text: string) => {
    const id = current.current.room;
    if (!id || busy || !text.trim()) return;
    const q = text.trim().slice(0, 600);
    setInput("");
    setBusy(true);
    engine.current.agentMood = "thinking";
    const history = conversations[id] ?? [];
    setConversations((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { role: "user", text: q }],
    }));
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 16000);
    try {
      const response = await fetch("/api/portfolio-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          section: id,
          project,
          history: history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      if (typeof data.answer !== "string") throw new Error("Invalid answer");
      if (current.current.room !== id || current.current.phase !== "chat") return;
      setConversations((prev) => ({
        ...prev,
        [id]: [
          ...(prev[id] ?? []),
          {
            role: "assistant",
            text: data.answer,
            mode:
              data.mode === "live"
                ? "P’AI · AI response"
                : "Portfolio lookup · content-backed response",
          },
        ],
      }));
      complete(id);
    } catch {
      if (
        current.current.room !== id ||
        current.current.phase !== "chat" ||
        (controller.signal.aborted && controller.signal.reason !== "timeout")
      )
        return;
      setConversations((prev) => ({
        ...prev,
        [id]: [
          ...(prev[id] ?? []),
          {
            role: "assistant",
            text: sectionAnswer(q, id, project),
            mode: "Portfolio lookup · offline fallback",
          },
        ],
      }));
      complete(id);
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        setBusy(false);
        engine.current.agentMood = "speaking";
      }
    }
  };
  const resetPlayer = () => {
    if (lock.current) return;
    request.current?.abort();
    setBusy(false);
    setRoom(null);
    setPhase("outdoor");
    engine.current = initialEngine();
    setGuide(false);
    setSettings(false);
    notify("Back at the central plaza.");
  };
  const resetAll = () => {
    resetPlayer();
    setCompleted([]);
    setCharacter("explorer");
    setConversations({});
    setTarget(null);
    setPhase("selection");
  };
  const start = () => {
    setPhase("arrival");
    engine.current.player.vy = reduced ? 0 : 3;
    later(
      () => {
        setPhase("outdoor");
        setGuide(true);
      },
      reduced ? 100 : 950,
    );
  };
  const activeRoom = room ? getDestination(room) : null;
  const prompt =
    phase === "driving"
      ? "E · Exit when stopped"
      : nearby?.kind === "entry"
        ? `E · Enter ${getDestination(nearby.section).name}`
        : nearby?.kind === "car"
          ? "E · Drive campus cruiser"
          : nearby?.kind === "exit"
            ? "E · Return to campus"
            : nearby?.kind === "agent"
              ? "E · Talk to P’AI"
              : nearby?.kind === "computer"
                ? "E · Open workstation"
                : null;
  const modalOpen = guide || settings || phase === "loading" || phase === "selection";
  return (
    <main
      id="main"
      className="portfolio-world"
      data-phase={phase}
      data-room={room ?? "campus"}
      data-player-x={mapPoint.x.toFixed(2)}
      data-player-z={mapPoint.z.toFixed(2)}
      data-speed={mapPoint.speed.toFixed(2)}
      data-player-y={mapPoint.y.toFixed(2)}
    >
      <div
        className="world-canvas"
        aria-label="Interactive 3D portfolio campus"
        onPointerDown={(e) => {
          if (
            e.button === 0 &&
            !modalOpen &&
            !["computer", "chat", "transition", "agent-walk"].includes(phase)
          ) {
            drag.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            engine.current.cameraYaw -= (e.clientX - drag.current.x) * 0.006;
            engine.current.cameraPitch = Math.max(
              0.18,
              Math.min(0.9, engine.current.cameraPitch + (e.clientY - drag.current.y) * 0.004),
            );
            drag.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {webgl ? (
          <SceneBoundary onFailure={() => setWebgl(false)}>
            <Canvas
              shadows={quality === "high"}
              dpr={quality === "high" ? [1, 1.6] : 1}
              camera={{ position: [10, 12, 22], fov: 48, near: 0.1, far: 150 }}
              gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
              fallback={
                <div className="world-unavailable">
                  <Link href="/standard">View standard portfolio ↗</Link>
                </div>
              }
            >
              <WorldScene
                engine={engine}
                keys={keys}
                phase={phase}
                room={room}
                character={character}
                target={target}
                project={project}
                onProject={setProject}
                reduced={reduced}
                quality={quality}
                paused={guide || settings}
                onTick={tick}
                onReady={() => setPhase((p) => (p === "loading" ? "selection" : p))}
                onAgentArrived={() => {
                  if (current.current.phase === "agent-walk" && current.current.room) {
                    setPhase("computer");
                    complete(current.current.room);
                  }
                }}
              />
            </Canvas>
          </SceneBoundary>
        ) : (
          <div className="world-unavailable">
            <h2>A simpler way to explore.</h2>
            <p>This browser doesn’t support the 3D world.</p>
            <Link href="/standard">View standard portfolio ↗</Link>
          </div>
        )}
      </div>
      <header className="world-header">
        <Link href="/" className="world-brand">
          <span>
            PA<span className="brand-dot">.</span>
          </span>
          <div>
            {portfolio.person.name}
            <small>{portfolio.person.identity}</small>
          </div>
        </Link>
        <div className="world-top-actions">
          <span className="world-live">
            <i /> A PORTFOLIO YOU CAN EXPLORE
          </span>
          <Link href="/standard" className="standard-link">
            View standard portfolio <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      {!modalOpen && (
        <>
          <div className="world-location">
            <span className="world-kicker">
              {room ? "INSIDE THE CAMPUS" : "WELCOME TO MY LITTLE WORLD"}
            </span>
            <h1>
              {activeRoom ? activeRoom.name : "The central plaza"}
              <span>↗</span>
            </h1>
            <p>
              {activeRoom
                ? activeRoom.subtitle
                : "Six destinations. One curious mind. Your own way around."}
            </p>
          </div>
          <nav className="destination-nav" aria-label="Direct section navigation">
            {destinations.map((d) => (
              <button
                key={d.id}
                disabled={phase === "transition" || phase === "agent-walk" || phase === "arrival"}
                aria-current={room === d.id ? "location" : undefined}
                onClick={() => {
                  if (phase === "driving") {
                    notify("Leave the car before entering a building.");
                    return;
                  }
                  transition(d.id, true);
                }}
              >
                <span>{completed.includes(d.id) ? <Check size={12} /> : d.number}</span>
                {d.name}
              </button>
            ))}
          </nav>
        </>
      )}
      {phase === "loading" && webgl && (
        <div className="arrival-overlay">
          <div className="loading-world">
            <span className="world-kicker">PREPARING YOUR VISIT</span>
            <h1>
              A small world.
              <br />A bigger picture.
            </h1>
            <span className="loading-bar" />
            <p>Building the campus…</p>
            <Link href="/standard">View standard portfolio ↗</Link>
          </div>
        </div>
      )}
      {phase === "selection" && webgl && (
        <div className="arrival-overlay selection-overlay">
          <div className="selection-intro">
            <span className="world-kicker">
              <i /> THE PRADYUMNA AHER CAMPUS
            </span>
            <h1>
              Good ideas start
              <br />
              with <em>exploration.</em>
            </h1>
            <p>
              Step into my world of applied AI, software,
              <br className="desktop-break" /> and things built with intention.
            </p>
            <span className="selection-note">A PLAYABLE PORTFOLIO / NO DOWNLOAD NEEDED</span>
          </div>
          <div
            className="character-select"
            ref={modal}
            tabIndex={-1}
            role="dialog"
            aria-modal="false"
            aria-labelledby="character-title"
          >
            <div className="select-heading">
              <div>
                <span className="world-kicker">01 / BEFORE WE BEGIN</span>
                <h2 id="character-title">Choose your explorer.</h2>
              </div>
              <Compass size={27} />
            </div>
            <div className="character-options">
              {choices.map((c, i) => (
                <button
                  key={c.id}
                  className={character === c.id ? "selected" : ""}
                  aria-pressed={character === c.id}
                  onClick={() => setCharacter(c.id)}
                >
                  <div className={`character-icon ${c.id}`}>
                    <span />
                    <i />
                    <b />
                  </div>
                  <span className="character-num">0{i + 1}</span>
                  <strong>{c.name}</strong>
                  <small>{c.description}</small>
                  <span className="character-choice">
                    {character === c.id ? <Check size={13} /> : <span />}
                  </span>
                </button>
              ))}
            </div>
            <div className="selection-bottom">
              <span>
                {completed.length
                  ? `${completed.length} of 6 destinations explored · progress saved`
                  : "Walk. Meet the guides. See what I build."}
              </span>
              <button className="world-primary" onClick={start}>
                Start exploring <ArrowUpRight size={17} />
              </button>
            </div>
            <p className="selection-controls">
              WASD to move <span>·</span> E to interact <span>·</span> Drag to look around
            </p>
          </div>
          <div className="selection-footer">
            <span>DESIGNED FOR CURIOUS PEOPLE</span>
            <span>
              THANE, INDIA <i /> OPEN TO AI ENGINEERING OPPORTUNITIES
            </span>
          </div>
        </div>
      )}
      {!modalOpen && (
        <>
          <aside
            className={`minimap ${mapOpen ? "" : "minimap-collapsed"}`}
            aria-label="Campus minimap"
          >
            <button className="minimap-title" onClick={() => setMapOpen((v) => !v)}>
              <span>
                <MapPin size={13} /> CAMPUS MAP
              </span>
              <span>{mapOpen ? "−" : "+"}</span>
            </button>
            {mapOpen && (
              <>
                <svg
                  viewBox="0 0 250 220"
                  role="img"
                  aria-label="Player, car, roads, and destination positions"
                >
                  <rect x="8" y="8" width="234" height="204" rx="8" fill="#dee3d2" />
                  <path
                    d="M125 18V202 M25 52H225 M25 110H225 M25 168H225"
                    stroke="#f7f3e9"
                    strokeWidth="16"
                  />
                  <circle cx="125" cy="110" r="26" fill="#f4eee0" />
                  {target && (
                    <path
                      d={`M${125 + (room ? getDestination(room).x + mapPoint.x * 0.3 : mapPoint.x) * 4} ${110 + (room ? getDestination(room).z + mapPoint.z * 0.3 : mapPoint.z) * 4} L${125 + (getDestination(target).x < 0 ? -20 : 20)} ${110 + (room ? getDestination(room).z + mapPoint.z * 0.3 : mapPoint.z) * 4} L${125 + (getDestination(target).x < 0 ? -20 : 20)} ${110 + getDestination(target).z * 4} L${125 + entrance(target).x * 4} ${110 + getDestination(target).z * 4}`}
                      stroke="#bf8a45"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4 3"
                    />
                  )}
                  {destinations.map((d) => (
                    <g key={d.id}>
                      <rect
                        x={125 + d.x * 4 - 17}
                        y={110 + d.z * 4 - 15}
                        width="34"
                        height="30"
                        rx="4"
                        fill={
                          completed.includes(d.id)
                            ? "#527d64"
                            : target === d.id
                              ? "#bf8a45"
                              : d.color
                        }
                        stroke={room === d.id ? "#243e32" : "#ffffff"}
                        strokeWidth={room === d.id ? 3 : 1}
                      />
                      <text
                        x={125 + d.x * 4}
                        y={114 + d.z * 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="10"
                      >
                        {completed.includes(d.id) ? "✓" : d.number}
                      </text>
                    </g>
                  ))}
                  <rect
                    x={125 + mapPoint.carX * 4 - 3}
                    y={110 + mapPoint.carZ * 4 - 5}
                    width="6"
                    height="10"
                    rx="2"
                    fill="#ce7953"
                  />
                  <g
                    transform={`translate(${125 + (room ? getDestination(room).x + mapPoint.x * 0.3 : mapPoint.x) * 4} ${110 + (room ? getDestination(room).z + mapPoint.z * 0.3 : mapPoint.z) * 4}) rotate(${(-mapPoint.yaw * 180) / Math.PI + 180})`}
                  >
                    <circle r="7" fill="#fff" />
                    <path d="M0 -5L4 4L0 2L-4 4Z" fill="#273f32" />
                  </g>
                </svg>
                <div className="map-markers">
                  {destinations.map((d) => (
                    <button
                      key={d.id}
                      aria-pressed={target === d.id}
                      onClick={() => setTarget(d.id)}
                    >
                      <i style={{ background: completed.includes(d.id) ? "#527d64" : d.color }} />
                      {d.name}
                    </button>
                  ))}
                </div>
                {target && (
                  <div className="map-route">
                    <span>{getDestination(target).name}</span>
                    <button
                      disabled={
                        phase === "driving" ||
                        phase === "transition" ||
                        phase === "agent-walk" ||
                        phase === "arrival"
                      }
                      onClick={() => transition(target, true)}
                    >
                      Quick travel <ChevronRight size={12} />
                    </button>
                  </div>
                )}
                <div className="exploration-progress">
                  <span>{completed.length} of 6 destinations explored</span>
                  <div>
                    <i style={{ width: `${(completed.length / 6) * 100}%` }} />
                  </div>
                </div>
              </>
            )}
          </aside>
          <div className="world-tools">
            <button aria-label="Open controls guide" onClick={() => setGuide(true)}>
              <HelpCircle size={17} />
              <span>Controls</span>
            </button>
            <button aria-label="Open world settings" onClick={() => setSettings(true)}>
              <Settings2 size={17} />
            </button>
            <button
              aria-label="Reset player to plaza"
              disabled={phase === "transition" || phase === "agent-walk" || phase === "arrival"}
              onClick={resetPlayer}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          {prompt && (
            <button className="interact-prompt" onClick={interact}>
              <kbd>E</kbd>
              {prompt.replace("E · ", "")}
              <ChevronRight size={15} />
            </button>
          )}
          {phase === "driving" && (
            <div className="driving-status">
              <CarFront size={16} />
              {Math.abs(mapPoint.speed) < 0.3 ? "Parked · E to exit" : "W / S · Accelerate / brake"}
              <span>A / D · steer</span>
            </div>
          )}
          {phase === "agent-walk" && (
            <div className="agent-walking">
              <Monitor size={17} /> Your guide is opening the workstation…
            </div>
          )}
          {phase === "computer" && (
            <>
              <div className="computer-controls">
                <span>
                  <Monitor size={16} /> {activeRoom?.name} / WORKSTATION
                </span>
                <button onClick={closeInteraction}>
                  <ArrowLeft size={14} /> Back to room <kbd>Esc</kbd>
                </button>
              </div>
              <div className="mobile-computer">
                <SectionContent section={room!} project={project} onProject={setProject} />
              </div>
            </>
          )}
          {(phase === "outdoor" || phase === "indoor" || phase === "driving") && (
            <div className="mobile-controls">
              <Joystick keys={keys} />
              <div>
                <button aria-label="Interact" onClick={interact}>
                  E
                </button>
                {phase !== "driving" && (
                  <button
                    aria-label="Jump"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keys.current.add(" ");
                      if (engine.current.player.y === 0) engine.current.jumpQueued = true;
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerUp={() => keys.current.delete(" ")}
                    onPointerCancel={() => keys.current.delete(" ")}
                  >
                    ↑
                  </button>
                )}
                <button
                  aria-label="Run"
                  onPointerDown={(e) => {
                    keys.current.add("shift");
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerUp={() => keys.current.delete("shift")}
                  onPointerCancel={() => keys.current.delete("shift")}
                >
                  Run
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {phase === "chat" && activeRoom && (
        <aside className="world-chat" aria-label={`${activeRoom.name} conversation`}>
          <header>
            <div className="chat-avatar">
              P<span>’AI</span>
            </div>
            <div>
              <strong>
                Your {activeRoom.id === "thinking" ? "systems" : activeRoom.name.toLowerCase()}{" "}
                guide
              </strong>
              <small>
                <i /> {busy ? "Thinking…" : "Ready when you are"}
              </small>
            </div>
            <button aria-label="Close conversation" onClick={closeInteraction}>
              <X size={17} />
            </button>
          </header>
          <p className="chat-disclosure">
            Answers use published portfolio content. Each response identifies live AI or
            content-backed lookup.
          </p>
          <div className="world-messages" ref={chatScroll} aria-live="polite">
            {(conversations[room!] ?? []).map((m, i) => (
              <div key={i} className={`world-message ${m.role}`}>
                <p>{m.text}</p>
                {m.mode && <small>{m.mode}</small>}
              </div>
            ))}
            {busy && <div className="thinking-dots">•••</div>}
          </div>
          {room === "projects" && (
            <div className="chat-project-context">
              <label htmlFor="chat-project">Project context</label>
              <select
                id="chat-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                {portfolio.projects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="chat-suggestions">
            {activeRoom.prompts.map((q) => (
              <button key={q} disabled={busy} onClick={() => send(q)}>
                {q}
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
          <button className="show-computer" onClick={showComputer}>
            <Monitor size={15} /> Show me on the computer <ArrowUpRight size={14} />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={chatInput}
              aria-label="Ask your section guide"
              maxLength={600}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the published portfolio…"
            />
            <button aria-label="Send question" disabled={busy || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
      {(guide || settings) && (
        <div
          className="world-modal-backdrop"
          onClick={() => {
            setGuide(false);
            setSettings(false);
          }}
        >
          <div
            className="world-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            ref={modal}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const items =
                  e.currentTarget.querySelectorAll<HTMLElement>("button,select,input,a");
                const first = items[0],
                  last = items[items.length - 1];
                if (
                  e.shiftKey &&
                  (document.activeElement === first || document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setGuide(false);
                setSettings(false);
              }}
            >
              <X size={20} />
            </button>
            <span className="world-kicker">MAKE YOURSELF AT HOME</span>
            <h2 id="modal-title">{guide ? "A little field guide." : "Your world, your pace."}</h2>
            {guide ? (
              <>
                <div className="controls-grid">
                  {[
                    ["WASD / ↑↓←→", "Move · accelerate & steer"],
                    ["Space", "Jump on foot"],
                    ["Shift", "Run"],
                    ["E", "Interact · enter · drive"],
                    ["Mouse drag", "Rotate the camera"],
                    ["Esc", "Close chat or computer"],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <kbd>{a}</kbd>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <p>
                  Enter a destination, then ask its guide a question or open the computer to
                  complete its checkpoint. Select a map marker for a route or quick travel.
                </p>
                <p>
                  On touch screens, use the joystick and action buttons. Drag the scene to look
                  around.
                </p>
                <button className="world-primary" onClick={() => setGuide(false)}>
                  Let’s explore <ArrowUpRight size={16} />
                </button>
              </>
            ) : (
              <>
                <label className="setting-row">
                  Render quality
                  <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                    <option value="high">High · soft shadows</option>
                    <option value="low">Low · lighter rendering</option>
                  </select>
                </label>
                <label className="setting-row">
                  Reduced motion
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => setReduced(e.target.checked)}
                  />
                </label>
                <p>
                  Your character and completed destinations are saved on this device when browser
                  storage is available.
                </p>
                <button className="world-secondary" onClick={resetAll}>
                  Reset exploration & character
                </button>
                <Link href="/standard" className="world-secondary">
                  View standard portfolio ↗
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      {notice && (
        <div className="world-notice" role="status">
          {notice}
        </div>
      )}
      <div className={`transition-fade ${fade ? "active" : ""}`} aria-hidden="true" />
    </main>
  );
}
function Joystick({ keys }: { keys: React.MutableRefObject<Set<string>> }) {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const clear = () => {
    ["w", "a", "s", "d"].forEach((k) => keys.current.delete(k));
    setThumb({ x: 0, y: 0 });
  };
  const update = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2,
      y = e.clientY - r.top - r.height / 2;
    const len = Math.hypot(x, y);
    const scale = Math.min(1, 30 / (len || 1));
    setThumb({ x: x * scale, y: y * scale });
    ["w", "a", "s", "d"].forEach((k) => keys.current.delete(k));
    if (y < -8) keys.current.add("w");
    if (y > 8) keys.current.add("s");
    if (x < -8) keys.current.add("a");
    if (x > 8) keys.current.add("d");
  };
  return (
    <div
      className="joystick"
      role="group"
      aria-label="Virtual movement joystick"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onLostPointerCapture={clear}
    >
      <i style={{ transform: `translate(${thumb.x}px,${thumb.y}px)` }} />
    </div>
  );
}
