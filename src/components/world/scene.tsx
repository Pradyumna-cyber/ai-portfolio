"use client";
/* eslint-disable react-hooks/immutability -- Three.js frame callbacks intentionally mutate the shared simulation and camera without triggering React renders. */
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { portfolio } from "@/content/portfolio";
import {
  destinations,
  trees,
  getDestination,
  outdoorBoxes,
  indoorBoxes,
  slideMove,
  agentPosition,
  type Character,
  type Engine,
  type Phase,
  type Section,
  type Box,
} from "./model";
import { SectionContent } from "./section-content";

function Block({
  position,
  size,
  color,
  ...props
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} {...props} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
function Label({
  text,
  position,
  width = 4,
  color = "#33453c",
  size = 40,
  rotation = [0, 0, 0],
}: {
  text: string;
  position: [number, number, number];
  width?: number;
  color?: string;
  size?: number;
  rotation?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const c = canvas.getContext("2d")!;
    c.clearRect(0, 0, 1024, 160);
    c.fillStyle = color;
    c.font = `600 ${size * 2}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 512, 80, 980);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, size]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width * 0.15625]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
function Tree({ x, z, index }: { x: number; z: number; index: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 6]} />
        <meshStandardMaterial color="#89775b" />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color={index % 2 ? "#78956a" : "#91a77b"} />
      </mesh>
      <mesh position={[0.7, 2.9, 0.1]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#a1b58c" />
      </mesh>
    </group>
  );
}
export function Avatar({
  character,
  engine,
  preview = false,
  npc = false,
  position = [0, 0, 0],
}: {
  character: Character;
  engine: MutableRefObject<Engine>;
  preview?: boolean;
  npc?: boolean;
  position?: [number, number, number];
}) {
  const root = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    leftLeg = useRef<THREE.Group>(null),
    rightLeg = useRef<THREE.Group>(null),
    head = useRef<THREE.Mesh>(null);
  const color =
    character === "explorer" ? "#ce7753" : character === "robot" ? "#91a7a2" : "#eadbc3";
  useFrame((_, dt) => {
    if (!root.current) return;
    const e = engine.current;
    const t = e.reduced ? 0 : e.clock;
    const walking =
      !e.reduced &&
      (npc
        ? e.agentProgress > 0.12 &&
          e.agentProgress < 1 &&
          (e.phase === "agent-walk" || (e.agentReturning && e.phase === "indoor"))
        : e.moving > 0.1);
    const sleepy = npc && e.agentMood === "sleepy" && e.agentProgress === 0;
    if (!preview && !npc) {
      root.current.position.set(e.player.x, e.player.y, e.player.z);
      root.current.rotation.y = e.player.yaw;
    }
    if (npc) {
      const p = e.agentProgress;
      const here = agentPosition(p),
        next = agentPosition(p + (e.agentReturning ? -0.002 : 0.002));
      root.current.position.set(here.x, -0.4 * Math.max(0, 1 - p / 0.12), here.z);
      root.current.rotation.y =
        e.phase === "chat"
          ? Math.atan2(e.player.x - here.x, e.player.z - here.z)
          : p === 1 && !e.agentReturning
            ? Math.atan2(2 - here.x, -3.35 - here.z)
            : p > 0
              ? Math.atan2(next.x - here.x, next.z - here.z)
              : e.agentMood === "sleepy"
                ? Math.sin(t * 0.2) * 0.05
                : Math.atan2(e.player.x + 2, e.player.z + 4);
    }
    if (head.current)
      head.current.rotation.x = sleepy
        ? 0.22 + Math.sin(t * 1.2) * 0.08
        : npc && e.agentMood === "thinking"
          ? Math.sin(t * 2) * 0.07
          : 0;
    if (preview) root.current.rotation.y = Math.sin(t * 0.6) * 0.2;
    if (left.current)
      left.current.rotation.x = walking
        ? Math.sin(t * 9) * 0.7
        : sleepy
          ? -0.3
          : e.agentMood === "speaking" && npc
            ? Math.sin(t * 5) * 0.4 - 1.2
            : Math.sin(t * 2) * 0.06;
    if (right.current)
      right.current.rotation.x = walking
        ? -Math.sin(t * 9) * 0.7
        : npc && e.agentProgress === 1
          ? -1.1
          : Math.sin(t * 2 + 1) * 0.06;
    const jumping = !npc && !preview && e.player.y > 0.1;
    if (leftLeg.current)
      leftLeg.current.rotation.x = jumping
        ? -0.4
        : walking
          ? Math.sin(t * (e.moving > 4 ? 13 : 9)) * 0.5
          : 0;
    if (rightLeg.current)
      rightLeg.current.rotation.x = jumping
        ? 0.3
        : walking
          ? -Math.sin(t * (e.moving > 4 ? 13 : 9)) * 0.5
          : 0;
    root.current.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 8));
  });
  return (
    <group ref={root} position={position}>
      <group position={[0, 1.15, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.27, 0.45, 4, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Block
          position={[0, 0.04, 0.26]}
          size={[0.26, 0.19, 0.06]}
          color={character === "robot" ? "#364d4a" : "#eee3cd"}
        />
        <group ref={left} position={[-0.4, 0.23, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.095, 0.4, 3, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        <group ref={right} position={[0.4, 0.23, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.095, 0.4, 3, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        <mesh ref={head} position={[0, 0.68, 0]} castShadow>
          {character === "robot" ? (
            <boxGeometry args={[0.53, 0.43, 0.42]} />
          ) : (
            <sphereGeometry args={[0.29, 12, 10]} />
          )}
          <meshStandardMaterial color={character === "explorer" ? "#e9bb96" : color} />
        </mesh>
        <Block position={[0, 0.69, 0.255]} size={[0.38, 0.12, 0.07]} color="#354c48" />
        {character === "robot" && (
          <>
            <mesh position={[0, 1.02, 0]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshStandardMaterial color="#e8b45c" emissive="#e8b45c" emissiveIntensity={0.5} />
            </mesh>
            <Block position={[0, 0.94, 0]} size={[0.04, 0.17, 0.04]} color="#334d46" />
          </>
        )}
        {character === "explorer" && (
          <Block position={[0, 0.94, 0]} size={[0.65, 0.12, 0.56]} color="#4a6658" />
        )}
        {character === "astronaut" && (
          <>
            <mesh position={[0, 0.68, 0]}>
              <sphereGeometry args={[0.34, 12, 10]} />
              <meshStandardMaterial color="#ded7c6" transparent opacity={0.22} />
            </mesh>
            <Block position={[0, 0, -0.32]} size={[0.4, 0.52, 0.22]} color="#82988d" />
          </>
        )}
      </group>
      <group ref={leftLeg} position={[-0.15, 0.7, 0]}>
        <Block position={[0, -0.3, 0]} size={[0.18, 0.65, 0.21]} color="#445c54" />
        <Block position={[0, -0.61, 0.07]} size={[0.22, 0.16, 0.34]} color="#2f443c" />
      </group>
      <group ref={rightLeg} position={[0.15, 0.7, 0]}>
        <Block position={[0, -0.3, 0]} size={[0.18, 0.65, 0.21]} color="#445c54" />
        <Block position={[0, -0.61, 0.07]} size={[0.22, 0.16, 0.34]} color="#2f443c" />
      </group>
      {npc && (
        <Billboard>
          <Label
            text="P’AI · section guide"
            position={[0, 2.45, 0]}
            width={2.5}
            color="#475c4c"
            size={32}
          />
        </Billboard>
      )}
    </group>
  );
}
function Building({ id, active }: { id: Section; active: boolean }) {
  const d = getDestination(id);
  const facing = d.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={[d.x, 0, d.z]} rotation={[0, facing, 0]}>
      <Block position={[0, 0.13, 0]} size={[10, 0.26, 10]} color="#d8d5c3" />
      <Block position={[0, 2, 0]} size={[8.8, 3.8, 8.8]} color="#eee7d7" />
      <Block position={[0, 3.95, 0]} size={[9.3, 0.3, 9.3]} color={d.color} />
      {id === "about" && (
        <mesh position={[0, 4.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[6.65, 1.4, 4]} />
          <meshStandardMaterial color={d.color} />
        </mesh>
      )}
      {id === "experience" &&
        [-2.8, 2.8].map((x) => (
          <Block key={x} position={[x, 2.2, 4.48]} size={[0.3, 3.4, 0.4]} color={d.color} />
        ))}
      {id === "projects" && (
        <>
          <Block position={[0, 4.3, 0]} size={[5, 0.4, 5]} color="#adbba1" />
          <Label text="BUILD / TEST / LEARN" position={[0, 3.5, 4.49]} width={5} size={26} />
        </>
      )}
      {id === "thinking" && (
        <mesh position={[0, 4.2, 0]}>
          <sphereGeometry args={[2.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={d.color} />
        </mesh>
      )}
      {id === "skills" &&
        [-2, 0, 2].map((x) => (
          <Block key={x} position={[x, 4.5, 0]} size={[1.2, 0.7, 5]} color="#769291" />
        ))}
      {id === "contact" && <Block position={[0, 3.2, 5]} size={[8, 0.2, 2.6]} color={d.color} />}
      <Block position={[0, 1.25, 4.43]} size={[1.65, 2.5, 0.12]} color="#4d675d" />
      <Block position={[0.55, 1.3, 4.53]} size={[0.07, 0.3, 0.08]} color="#eadfc1" />
      {[-2.7, 2.7].map((x) => (
        <group key={x}>
          <Block position={[x, 2.1, 4.44]} size={[2, 1.6, 0.1]} color="#b6cdc8" />
          <Block position={[x, 2.1, 4.53]} size={[0.07, 1.6, 0.08]} color="#edf1e7" />
          <Block position={[x, 2.1, 4.53]} size={[2, 0.07, 0.08]} color="#edf1e7" />
        </group>
      ))}
      <Block position={[0, 3.14, 4.54]} size={[7.3, 0.68, 0.12]} color="#f6f0e3" />
      <Label text={`${d.number}   ${d.name}`} position={[0, 3.15, 4.62]} width={6.8} size={34} />
      <Block
        position={[0, 0.12, 5]}
        size={[2.7, 0.22, 1.3]}
        color={active ? "#e9b966" : "#c9cabb"}
      />
      <mesh position={[0, 0.03, 5.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color={active ? "#e5ad45" : d.color} />
      </mesh>
      {[-3.8, 3.8].map((x) => (
        <group key={x}>
          <Block position={[x, 0.35, 5]} size={[0.65, 0.7, 0.65]} color={d.color} />
          <mesh position={[x, 0.9, 5]} castShadow>
            <sphereGeometry args={[0.55, 8, 6]} />
            <meshStandardMaterial color="#7e9b6e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Car({
  engine,
  driving,
  character,
}: {
  engine: MutableRefObject<Engine>;
  driving: boolean;
  character: Character;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const c = engine.current.car;
    ref.current?.position.set(c.x, 0, c.z);
    if (ref.current) ref.current.rotation.y = c.yaw;
  });
  return (
    <group ref={ref}>
      <Block position={[0, 0.65, 0]} size={[1.6, 0.55, 2.8]} color="#cb805c" />
      <mesh position={[0, 1.05, -0.1]}>
        <boxGeometry args={[1.45, 0.5, 1.3]} />
        <meshStandardMaterial color="#d0e1d5" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <Block position={[0, 1.35, -0.15]} size={[1.55, 0.12, 1.5]} color="#eee7d6" />
      {[-0.83, 0.83].flatMap((x) =>
        [-0.85, 0.85].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.2, 12]} />
            <meshStandardMaterial color="#34423b" />
          </mesh>
        )),
      )}
      <Block position={[0, 0.67, 1.42]} size={[1.2, 0.12, 0.06]} color="#fff3bd" />
      {driving && (
        <group position={[-0.35, 0.23, 0]} scale={0.53}>
          <Avatar character={character} engine={engine} preview />
        </group>
      )}
      <Billboard>
        <Label text="CAMPUS CRUISER" position={[0, 1.85, 0]} width={3} size={28} />
      </Billboard>
    </group>
  );
}
function Campus({
  engine,
  phase,
  character,
  target,
}: {
  engine: MutableRefObject<Engine>;
  phase: Phase;
  character: Character;
  target: Section | null;
}) {
  return (
    <>
      <color attach="background" args={["#dce4d5"]} />
      <fog attach="fog" args={["#dce4d5", 45, 95]} />
      <Block position={[0, -0.4, 0]} size={[58, 0.8, 54]} color="#aebb96" />
      <Block position={[0, -0.035, 0]} size={[12, 0.08, 48]} color="#d5d4c4" />
      {[-14, 0, 14].map((z) => (
        <Block key={z} position={[0, -0.01, z]} size={[45, 0.08, 3.5]} color="#dad8c9" />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[8.1, 64]} />
        <meshStandardMaterial color="#eee7d8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[7.6, 7.7, 64]} />
        <meshStandardMaterial color="#b5bcaa" />
      </mesh>
      <Block position={[0, 0.48, 0]} size={[3.4, 0.96, 3.4]} color="#b5c1b1" />
      <mesh position={[0, 1.35, 0]} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#c88856" metalness={0.35} roughness={0.4} />
      </mesh>
      <Label text={portfolio.person.name} position={[0, 3.4, -3]} width={8} size={48} />
      <Label
        text={portfolio.person.identity.toUpperCase()}
        position={[0, 2.65, -3]}
        width={5}
        size={30}
      />
      {destinations.map((d) => (
        <Building key={d.id} id={d.id} active={target === d.id} />
      ))}
      {target &&
        (() => {
          const d = getDestination(target);
          return (
            <>
              <Block
                position={[d.x < 0 ? -5 : 5, 0.09, (engine.current.player.z + d.z) / 2]}
                size={[0.14, 0.03, Math.abs(engine.current.player.z - d.z) || 0.2]}
                color="#bf8a45"
              />
              <Block
                position={[d.x < 0 ? -8.2 : 8.2, 0.09, d.z]}
                size={[6.4, 0.03, 0.14]}
                color="#bf8a45"
              />
            </>
          );
        })()}
      {trees.map((t, i) => (
        <Tree key={i} {...t} index={i} />
      ))}
      {[-7, 7].flatMap((x) =>
        [-18, -8, 8, 18].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <Block position={[0, 1.5, 0]} size={[0.08, 3, 0.08]} color="#607366" />
            <mesh position={[0, 3, 0]}>
              <sphereGeometry args={[0.21, 8, 6]} />
              <meshStandardMaterial color="#ffedc4" emissive="#ffdc92" emissiveIntensity={0.35} />
            </mesh>
          </group>
        )),
      )}
      <Car engine={engine} driving={phase === "driving"} character={character} />
      {phase === "selection"
        ? (["explorer", "robot", "astronaut"] as Character[]).map((c, i) => (
            <group key={c} position={[(i - 1) * 2.4, 0, 5]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <circleGeometry args={[0.85, 32]} />
                <meshStandardMaterial color={character === c ? "#efc485" : "#c8d1bd"} />
              </mesh>
              <Avatar character={c} engine={engine} preview />
            </group>
          ))
        : phase !== "driving" && <Avatar character={character} engine={engine} />}
    </>
  );
}
function Room({
  section,
  engine,
  phase,
  character,
  project,
  onProject,
}: {
  section: Section;
  engine: MutableRefObject<Engine>;
  phase: Phase;
  character: Character;
  project: string;
  onProject: (s: string) => void;
}) {
  const d = getDestination(section);
  return (
    <>
      <color attach="background" args={["#e6e3d8"]} />
      <Block position={[0, -0.15, 0]} size={[14, 0.3, 14]} color="#ddd7c7" />
      <Block position={[0, 2, -7]} size={[14, 4, 0.3]} color="#eee9dc" />
      <Block position={[-7, 2, 0]} size={[0.3, 4, 14]} color="#eee9dc" />
      <Block position={[7, 2, 0]} size={[0.3, 4, 14]} color="#eee9dc" />
      {[-4.25, 4.25].map((x) => (
        <Block key={x} position={[x, 2, 7]} size={[5.5, 4, 0.3]} color="#eee9dc" />
      ))}
      <Block position={[0, 0.02, 1]} size={[6, 0.04, 7]} color={d.color} />
      <Label text={d.name.toUpperCase()} position={[0, 3.3, -6.8]} width={8} size={38} />
      <Label text={d.subtitle} position={[0, 2.65, -6.8]} width={5} size={28} />
      <Block position={[0, 1.03, -3]} size={[6, 0.2, 1.8]} color="#ae9270" />
      {[-2.6, 2.6].flatMap((x) =>
        [-3.55, -2.45].map((z) => (
          <Block key={`${x}${z}`} position={[x, 0.5, z]} size={[0.12, 1, 0.12]} color="#687a6a" />
        )),
      )}
      <Block position={[-2, 0.5, -4]} size={[1, 0.15, 1]} color="#7c8e7d" />
      <Block position={[-2, 0.9, -4.4]} size={[1, 0.9, 0.15]} color="#7c8e7d" />
      <Block position={[2, 1.3, -3.3]} size={[0.18, 0.45, 0.2]} color="#40554c" />
      <Block position={[2, 1.13, -3.3]} size={[0.9, 0.08, 0.5]} color="#40554c" />
      <Block position={[2, 2.12, -3.35]} size={[3.4, 2.2, 0.15]} color="#344d43" />
      <mesh position={[2, 2.12, -3.26]}>
        <planeGeometry args={[3.16, 1.98]} />
        <meshBasicMaterial color="#e9efe3" />
      </mesh>
      {phase !== "computer" && (
        <>
          <Label text="OPEN WORKSTATION" position={[2, 2.15, -3.16]} width={2.8} size={34} />
          <Label
            text="Walk over or ask your guide"
            position={[2, 1.77, -3.16]}
            width={2.6}
            size={25}
          />
        </>
      )}
      {phase === "computer" && (
        <Html transform position={[2, 2.12, -3.23]} distanceFactor={1.8} zIndexRange={[30, 20]}>
          <div className="monitor-interface" tabIndex={0} aria-label={`${d.name} computer display`}>
            <div className="monitor-top">
              <span>PA / WORKSPACE</span>
              <span>{d.name} · ONLINE</span>
            </div>
            <SectionContent section={section} project={project} onProject={onProject} />
          </div>
        </Html>
      )}
      <Block position={[2, 1.17, -2.65]} size={[1, 0.04, 0.3]} color="#e0d9c8" />
      <Avatar character="robot" engine={engine} npc />
      <Avatar character={character} engine={engine} />
      {[-5.8, 5.8].map((x) => (
        <group key={x}>
          <Block position={[x, 1.5, -3]} size={[1.4, 3, 5]} color="#9ca994" />
          {[-4.7, -3.4, -2.1].map((z, i) => (
            <Block
              key={z}
              position={[x, 2.2, z]}
              size={[1.5, 0.5, 0.5]}
              color={[d.color, "#c6ac85", "#e0dbc9"][i]}
            />
          ))}
          <Block position={[x, 2.8, 2]} size={[0.12, 1.8, 2.5]} color="#a9c6bc" />
        </group>
      ))}
      <Block position={[-4.5, 0.7, 2]} size={[2, 1.4, 1.5]} color={d.color} />
      <Block position={[-4.5, 1.2, 2.6]} size={[2, 0.8, 0.2]} color={d.color} />
      <Label
        text={
          section === "projects"
            ? "PROTOTYPES → PRODUCTS"
            : section === "thinking"
              ? "WORKFLOW → SYSTEM → TRUST"
              : section === "experience"
                ? "TCS  /  EY"
                : section === "skills"
                  ? "BUILD WITH INTENT"
                  : section === "contact"
                    ? "LET’S CONNECT"
                    : "APPLIED AI BUILDER"
        }
        position={[-3.5, 2.2, -6.78]}
        width={4.5}
        size={23}
      />
      {section === "projects" && (
        <mesh position={[-4.5, 2.8, 2]}>
          <torusKnotGeometry args={[0.45, 0.11, 48, 8]} />
          <meshStandardMaterial color="#eed0a0" />
        </mesh>
      )}
      {section === "thinking" && (
        <group position={[-4.5, 2.6, 2]}>
          {[-0.6, 0, 0.6].map((x) => (
            <mesh key={x} position={[x, Math.abs(x), 0]}>
              <icosahedronGeometry args={[0.25, 0]} />
              <meshStandardMaterial color="#eee5d6" />
            </mesh>
          ))}
        </group>
      )}
      <Label
        text="EXIT · E"
        position={[0, 2.5, 6.9]}
        rotation={[0, Math.PI, 0]}
        width={2.8}
        size={32}
      />
      <mesh position={[0, 0.06, 5.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 32]} />
        <meshStandardMaterial color="#f3d795" />
      </mesh>
      <pointLight position={[0, 3, 1]} intensity={12} distance={18} color="#fff1d6" />
    </>
  );
}
export type SceneProps = {
  engine: MutableRefObject<Engine>;
  keys: MutableRefObject<Set<string>>;
  phase: Phase;
  room: Section | null;
  character: Character;
  target: Section | null;
  project: string;
  onProject: (s: string) => void;
  onTick: () => void;
  onReady: () => void;
  onAgentArrived: () => void;
  reduced: boolean;
  quality: string;
  paused: boolean;
};
export function WorldScene(props: SceneProps) {
  const { engine, keys, phase, room, character, reduced, quality } = props;
  const { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const colliders = useMemo(() => {
    const boxes: Box[] = room
      ? [
          ...indoorBoxes,
          { x: 0, z: -7, w: 14, d: 0.3 },
          { x: -7, z: 0, w: 0.3, d: 14 },
          { x: 7, z: 0, w: 0.3, d: 14 },
          { x: 0, z: 7, w: 14, d: 0.3 },
        ]
      : [...outdoorBoxes, ...trees.map((t) => ({ ...t, w: 3.2, d: 3.2 }))];
    return boxes
      .map(
        (b) =>
          new THREE.Mesh(
            new THREE.BoxGeometry(b.w, room ? 4 : 5, b.d),
            new THREE.MeshBasicMaterial(),
          ),
      )
      .map((m, i) => {
        m.position.set(boxes[i].x, room ? 2 : 2.5, boxes[i].z);
        m.updateMatrixWorld();
        return m;
      });
  }, [room]);
  useEffect(
    () => () =>
      colliders.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }),
    [colliders],
  );
  const carCollider = useMemo(
    () => new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.65, 3.1), new THREE.MeshBasicMaterial()),
    [],
  );
  useEffect(
    () => () => {
      carCollider.geometry.dispose();
      (carCollider.material as THREE.Material).dispose();
    },
    [carCollider],
  );
  const cameraObstacles = useMemo(
    () => (room ? colliders : [...colliders, carCollider]),
    [room, colliders, carCollider],
  );
  const ready = useRef(false),
    ticker = useRef(0);
  const look = useRef(new THREE.Vector3(0, 1, 3));
  useFrame((_, rawDt) => {
    if (!ready.current) {
      ready.current = true;
      props.onReady();
    }
    const dt = Math.min(rawDt, 0.25),
      e = engine.current;
    e.reduced = reduced;
    e.phase = phase;
    e.clock += dt;
    const k = keys.current;
    const forward =
      Number(k.has("w") || k.has("arrowup")) - Number(k.has("s") || k.has("arrowdown"));
    const side =
      Number(k.has("d") || k.has("arrowright")) - Number(k.has("a") || k.has("arrowleft"));
    const foot =
      !props.paused &&
      (phase === "outdoor" || phase === "indoor" || (phase === "arrival" && !e.boarding));
    if (foot) {
      const magnitude = Math.hypot(forward, side) || 1;
      const speed = k.has("shift") ? 5.7 : 3.3;
      const vx =
        ((Math.cos(e.cameraYaw) * side - Math.sin(e.cameraYaw) * forward) / magnitude) * speed;
      const vz =
        ((-Math.sin(e.cameraYaw) * side - Math.cos(e.cameraYaw) * forward) / magnitude) * speed;
      e.player.vx = THREE.MathUtils.damp(e.player.vx, phase === "arrival" ? 0 : vx, 10, dt);
      e.player.vz = THREE.MathUtils.damp(e.player.vz, phase === "arrival" ? 0 : vz, 10, dt);
      const boxes = room ? indoorBoxes : [...outdoorBoxes, { ...e.car, w: 2.2, d: 3.2 }];
      const p = slideMove(
        e.player,
        e.player.vx * dt,
        e.player.vz * dt,
        boxes,
        0.38,
        room ? 6.8 : 27,
      );
      e.moving = Math.hypot(p.x - e.player.x, p.z - e.player.z) / dt;
      if (e.moving > 0.1)
        e.player.yaw = THREE.MathUtils.lerp(
          e.player.yaw,
          e.player.yaw +
            Math.atan2(
              Math.sin(Math.atan2(e.player.vx, e.player.vz) - e.player.yaw),
              Math.cos(Math.atan2(e.player.vx, e.player.vz) - e.player.yaw),
            ),
          1 - Math.exp(-12 * dt),
        );
      Object.assign(e.player, p);
      if (e.jumpQueued && e.player.y === 0) e.player.vy = 5;
      e.jumpQueued = false;
      const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
      for (let i = 0; i < steps; i++) {
        e.player.vy -= (14 * dt) / steps;
        e.player.y = Math.max(0, e.player.y + (e.player.vy * dt) / steps);
        if (e.player.y === 0) e.player.vy = 0;
      }
      if (e.player.y === 0) e.player.vy = 0;
    } else e.moving = 0;
    if ((phase === "transition" || (phase === "arrival" && e.boarding)) && e.approach) {
      const oldX = e.player.x,
        oldZ = e.player.z;
      e.player.x = THREE.MathUtils.damp(oldX, e.approach.x, 12, dt);
      e.player.z = THREE.MathUtils.damp(oldZ, e.approach.z, 12, dt);
      e.moving = Math.hypot(e.player.x - oldX, e.player.z - oldZ) / dt;
      if (e.moving > 0.1) e.player.yaw = Math.atan2(e.approach.x - oldX, e.approach.z - oldZ);
    }
    if (phase === "driving" && !props.paused) {
      const c = e.car;
      c.speed = THREE.MathUtils.clamp(c.speed + forward * 7 * dt, -3.5, 7);
      c.speed = THREE.MathUtils.damp(c.speed, 0, forward ? 0.35 : 3, dt);
      c.yaw -= side * c.speed * 0.32 * dt;
      const dx = Math.sin(c.yaw) * c.speed * dt,
        dz = Math.cos(c.yaw) * c.speed * dt;
      const p = slideMove(c, dx, dz, outdoorBoxes, 1.7, 27);
      if (Math.hypot(p.x - c.x, p.z - c.z) < Math.hypot(dx, dz) * 0.6) c.speed = 0;
      Object.assign(c, p);
      e.player.x = c.x;
      e.player.z = c.z;
      e.player.y = 0;
      e.player.yaw = c.yaw;
      e.cameraYaw = THREE.MathUtils.damp(e.cameraYaw, c.yaw - Math.PI, 2, dt);
    }
    if (phase === "agent-walk" && !props.paused) {
      e.agentProgress = Math.min(1, e.agentProgress + dt * (reduced ? 3 : 0.25));
      if (e.agentProgress === 1) props.onAgentArrived();
    }
    if (e.agentReturning && phase === "indoor" && !props.paused) {
      e.agentProgress = Math.max(0, e.agentProgress - dt * (reduced ? 3 : 0.25));
      if (e.agentProgress === 0) e.agentReturning = false;
    }
    let desired: THREE.Vector3;
    let target: THREE.Vector3;
    if (phase === "selection" || phase === "loading") {
      desired = new THREE.Vector3(10, 12, 22);
      target = new THREE.Vector3(0, 1, 0);
    } else if (phase === "computer") {
      desired = new THREE.Vector3(2, 2.13, 0.6);
      target = new THREE.Vector3(2, 2.12, -3.25);
    } else {
      const follow = phase === "driving" ? e.car : e.player;
      const r = room ? 6.2 : phase === "driving" ? 9 : 8;
      target = new THREE.Vector3(follow.x, 1.2 + (room ? 0 : 0.15), follow.z);
      desired = new THREE.Vector3(
        follow.x + Math.sin(e.cameraYaw) * r,
        1.6 + Math.sin(e.cameraPitch) * r,
        follow.z + Math.cos(e.cameraYaw) * r,
      );
      const dir = desired.clone().sub(target);
      const length = dir.length();
      ray.set(target, dir.normalize());
      ray.far = length;
      carCollider.position.set(e.car.x, 0.825, e.car.z);
      carCollider.rotation.y = e.car.yaw;
      carCollider.updateMatrixWorld();
      const hits = ray.intersectObjects(cameraObstacles, false);
      if (hits[0])
        desired = target.clone().addScaledVector(dir, Math.max(0.7, hits[0].distance - 0.3));
    }
    const blend = reduced ? 1 : 1 - Math.exp(-5 * dt);
    camera.position.lerp(desired, blend);
    if (!["computer", "selection", "loading"].includes(phase)) {
      const direction = camera.position.clone().sub(target);
      ray.set(target, direction.clone().normalize());
      ray.far = direction.length();
      const hit = ray.intersectObjects(cameraObstacles, false)[0];
      if (hit)
        camera.position
          .copy(target)
          .addScaledVector(direction.normalize(), Math.max(0.7, hit.distance - 0.3));
    }
    look.current.lerp(target, blend);
    camera.lookAt(look.current);
    ticker.current += dt;
    if (ticker.current > 0.1) {
      ticker.current = 0;
      props.onTick();
    }
  });
  const common = { engine, phase, character };
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#fdf2d9", "#739077", 1.3]} />
      <directionalLight
        position={[10, 25, 12]}
        intensity={2.3}
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.001}
      />
      {room ? (
        <Room {...common} section={room} project={props.project} onProject={props.onProject} />
      ) : (
        <Campus {...common} target={props.target} />
      )}
    </>
  );
}
