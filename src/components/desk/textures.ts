import * as THREE from "three";

function make(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  opts: { repeat?: [number, number]; srgb?: boolean } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...opts.repeat);
  }
  return tex;
}

/** Seeded random so textures look identical on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Warm walnut-ish grain for the desk top and shelf. */
export function woodTexture(base = "#9a6440") {
  const r = rng(7);
  return make(1024, 256, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 140; i++) {
      const y0 = r() * 256;
      const amp = 2 + r() * 6;
      const freq = 0.004 + r() * 0.01;
      c.strokeStyle = `rgba(${r() > 0.5 ? "60,30,15" : "190,130,85"},${0.05 + r() * 0.12})`;
      c.lineWidth = 0.6 + r() * 2.2;
      c.beginPath();
      for (let x = 0; x <= 1024; x += 8) c.lineTo(x, y0 + Math.sin(x * freq + i) * amp);
      c.stroke();
    }
  });
}

/** Oak floor planks, tiled across the floor. */
export function floorTexture() {
  const r = rng(11);
  return make(
    1024,
    1024,
    (c) => {
      const rows = 8;
      const ph = 1024 / rows;
      for (let row = 0; row < rows; row++) {
        let x = -r() * 400;
        while (x < 1024) {
          const len = 300 + r() * 300;
          const tone = 150 + r() * 30;
          c.fillStyle = `rgb(${tone},${tone * 0.68},${tone * 0.45})`;
          c.fillRect(x, row * ph, len, ph);
          for (let g = 0; g < 18; g++) {
            c.strokeStyle = `rgba(80,45,25,${0.04 + r() * 0.08})`;
            c.lineWidth = 0.5 + r() * 1.5;
            const gy = row * ph + r() * ph;
            c.beginPath();
            c.moveTo(x, gy);
            c.bezierCurveTo(
              x + len / 3,
              gy + r() * 6 - 3,
              x + (2 * len) / 3,
              gy + r() * 6 - 3,
              x + len,
              gy,
            );
            c.stroke();
          }
          c.fillStyle = "rgba(40,22,12,0.55)";
          c.fillRect(x, row * ph, 2, ph);
          x += len;
        }
        c.fillStyle = "rgba(40,22,12,0.6)";
        c.fillRect(0, row * ph, 1024, 2);
      }
    },
    { repeat: [6, 6] },
  );
}

/** Very subtle plaster noise so the walls don't look like flat CG. */
export function plasterTexture(base: string) {
  const r = rng(3);
  return make(
    512,
    512,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        c.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(80,60,40,0.05)";
        c.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
      }
    },
    { repeat: [8, 3] },
  );
}

/** Soft radial glow used for the monitor bias light on the wall. */
export function glowTexture(color: string) {
  return make(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
}

/**
 * The monitor's idle image, seen from across the room. It deliberately mirrors the
 * live DOM "OS" (dark, amber orb, folders, chat bar) so zooming in feels seamless.
 */
export function screenIdleTexture(folders: string[]) {
  const r = rng(5);
  return make(1600, 1000, (c) => {
    c.fillStyle = "#07070a";
    c.fillRect(0, 0, 1600, 1000);
    const glow = c.createRadialGradient(800, 420, 0, 800, 420, 620);
    glow.addColorStop(0, "rgba(255,140,40,0.55)");
    glow.addColorStop(0.45, "rgba(180,70,10,0.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, 1600, 1000);
    // grid
    c.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < 1600; x += 100) c.strokeRect(x, 0, 0.5, 1000);
    for (let y = 0; y < 1000; y += 100) c.strokeRect(0, y, 1600, 0.5);
    // particle orb
    const n = 1400;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      const a = 0.25 + ((z + 1) / 2) * 0.75;
      c.fillStyle = `rgba(255,${190 + r() * 50},${120 + r() * 60},${a})`;
      c.fillRect(800 + x * 230, 420 + y * 230, 2.4, 2.4);
    }
    c.font = "700 30px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = "#f4efe6";
    c.fillText("PA/OS", 60, 80);
    c.font = "500 20px ui-monospace, Menlo, monospace";
    c.fillStyle = "rgba(244,239,230,0.55)";
    c.fillText("[ APPLIED AI BUILDER ]", 60, 720);
    c.font = "800 64px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = "#f4efe6";
    c.fillText("PRADYUMNA AHER", 60, 800);
    // folders
    folders.forEach((_, i) => {
      const x = 1360;
      const y = 150 + i * 105;
      c.fillStyle = "#e8913a";
      c.fillRect(x, y, 70, 50);
      c.fillRect(x, y - 8, 30, 10);
      c.fillStyle = "rgba(244,239,230,0.6)";
      c.fillRect(x + 84, y + 20, 110, 8);
    });
    // chat bar
    c.fillStyle = "rgba(255,255,255,0.07)";
    c.beginPath();
    c.roundRect(400, 880, 800, 70, 35);
    c.fill();
    c.font = "500 24px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = "rgba(244,239,230,0.5)";
    c.fillText("Ask P’AI anything about Pradyumna…", 450, 924);
    c.font = "600 22px ui-monospace, Menlo, monospace";
    c.fillStyle = "#ffb15c";
    c.fillText("[ CLICK TO ENTER ]", 690, 1300 / 2 + 60);
  });
}

/** Book spines for the shelf. */
export function spineTexture(title: string, bg: string, fg: string) {
  return make(64, 256, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 64, 256);
    c.fillStyle = fg;
    c.fillRect(0, 18, 64, 3);
    c.fillRect(0, 235, 64, 3);
    c.save();
    c.translate(40, 128);
    c.rotate(-Math.PI / 2);
    c.font = "600 18px ui-sans-serif, system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText(title, 0, 0);
    c.restore();
  });
}

/** Dusk sky for the window. */
export function skyTexture() {
  return make(256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#28405f");
    g.addColorStop(0.55, "#e39a6f");
    g.addColorStop(1, "#f5d6a2");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = "rgba(35,45,65,0.6)";
    [
      [0, 210, 40, 46],
      [36, 190, 30, 66],
      [70, 220, 50, 36],
      [120, 180, 26, 76],
      [150, 205, 44, 51],
      [200, 195, 56, 61],
    ].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
  });
}
