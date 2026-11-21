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
