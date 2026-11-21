/**
 * Synthesised sound for design 2 (Web Audio, no files):
 *  - tick(): a crisp, very short click (Apple scroll-picker style) for each chapter change.
 * Browsers only allow audio after a user gesture (click/tap/key; wheel doesn't count), so
 * `unlock()` must be called from such a gesture if autoplay was refused.
 */
const PREF_KEY = "d2-sound";

export function soundPreference(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}
export function saveSoundPreference(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* private mode: preference just isn't remembered */
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  /** Creates the audio graph (suspended until a gesture allows it). */
  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(ctx.destination);

    // Pink-ish noise buffer used for the click.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
    this.noise = buf;
    return ctx;
  }

  /** Try to start right away (works when the browser permits autoplay). */
  async tryStart() {
    const ctx = this.ensure();
    if (!ctx) return false;
    try {
      await ctx.resume();
    } catch {
      return false;
    }
    if (ctx.state !== "running") return false;
    return true;
  }

  /** Call from a click/tap/key handler. */
  unlock() {
    return this.tryStart();
  }

  /** Apple-style scroll tick: ~12 ms band-passed noise click with a tiny tonal body. */
  tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.master || !this.noise || !this.enabled) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.55, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    g.connect(this.master);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 1.4;
    src.connect(bp).connect(g);
    src.start(now, Math.random() * 1.5, 0.03);

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(1900, now);
    body.frequency.exponentialRampToValueAtTime(900, now + 0.02);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.18, now);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    body.connect(bg).connect(this.master);
    body.start(now);
    body.stop(now + 0.03);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    const ctx = this.ctx;
    if (ctx && this.master) {
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.15);
    }
  }

  get running() {
    return this.ctx?.state === "running";
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
