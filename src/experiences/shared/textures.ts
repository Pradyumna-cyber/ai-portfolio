import * as THREE from "three";

/** Canvas-generated textures: no image downloads, deterministic output. */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  opts: { repeat?: [number, number]; srgb?: boolean } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...opts.repeat);
  }
  return tex;
}

export function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function woodTexture(base: string, seed = 7) {
  const r = seeded(seed);
  return canvasTexture(1024, 256, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 140; i++) {
      const y0 = r() * 256;
      const amp = 2 + r() * 6;
      const f = 0.004 + r() * 0.01;
      c.strokeStyle = `rgba(${r() > 0.5 ? "50,25,12" : "200,140,95"},${0.05 + r() * 0.12})`;
      c.lineWidth = 0.6 + r() * 2.2;
      c.beginPath();
      for (let x = 0; x <= 1024; x += 8) c.lineTo(x, y0 + Math.sin(x * f + i) * amp);
      c.stroke();
    }
  });
}

export function plankFloorTexture(
  tone: [number, number, number],
  repeat: [number, number],
  seed = 11,
) {
  const r = seeded(seed);
  return canvasTexture(
    1024,
    1024,
    (c) => {
      const rows = 8;
      const ph = 1024 / rows;
      for (let row = 0; row < rows; row++) {
        let x = -r() * 400;
        while (x < 1024) {
          const len = 300 + r() * 300;
          const k = 0.88 + r() * 0.2;
          c.fillStyle = `rgb(${tone[0] * k},${tone[1] * k},${tone[2] * k})`;
          c.fillRect(x, row * ph, len, ph);
          for (let g = 0; g < 16; g++) {
            c.strokeStyle = `rgba(30,18,10,${0.04 + r() * 0.08})`;
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
          c.fillStyle = "rgba(20,12,8,0.55)";
          c.fillRect(x, row * ph, 2, ph);
          x += len;
        }
        c.fillStyle = "rgba(20,12,8,0.6)";
        c.fillRect(0, row * ph, 1024, 2);
      }
    },
    { repeat },
  );
}

export function plasterTexture(base: string, repeat: [number, number] = [8, 3], seed = 3) {
  const r = seeded(seed);
  return canvasTexture(
    512,
    512,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        c.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,45,30,0.05)";
        c.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
      }
    },
    { repeat },
  );
}

export function radialGlowTexture(color: string) {
  return canvasTexture(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
}

/** Wrap `text` into lines no wider than `max` px. */
export function wrapLines(c: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > max && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export const FONT_SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
