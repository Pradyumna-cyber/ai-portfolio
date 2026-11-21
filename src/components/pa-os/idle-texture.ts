import * as THREE from "three";

function make(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
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
