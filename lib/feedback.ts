// Audio + haptic feedback for the scan page.
// Uses the Web Audio API so no asset files are needed.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    (window.AudioContext as typeof AudioContext) ??
    (window as any).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

function tone({
  freq,
  duration = 0.18,
  type = "sine",
  gain = 0.18,
  delay = 0,
}: {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function chimeSuccess() {
  // Two ascending notes — bright and short.
  tone({ freq: 880, duration: 0.12 });
  tone({ freq: 1320, duration: 0.18, delay: 0.09 });
  vibrate([40]);
}

export function chimeWarn() {
  // One mid tone — expired sub etc.
  tone({ freq: 660, duration: 0.18, type: "square", gain: 0.12 });
  tone({ freq: 660, duration: 0.18, type: "square", gain: 0.12, delay: 0.22 });
  vibrate([60, 80, 60]);
}

export function chimeError() {
  // Low buzz — unknown QR, error.
  tone({ freq: 220, duration: 0.32, type: "sawtooth", gain: 0.12 });
  vibrate([120]);
}

function vibrate(pattern: number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

// Some browsers require a user gesture before AudioContext can play.
// Call this from a click handler on first interaction.
export async function warmUpAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}
