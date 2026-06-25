"use client";

import { useEffect, useRef } from "react";
import { chimeSuccess, warmUpAudio } from "@/lib/feedback";

export type CelebrationTier = "base" | "streak" | "epic";

type Lang = "el" | "en";

// If you drop real video files into /public/celebrations/{base,streak,epic}.mp4
// flip this to true and they'll play on top of the particle burst.
const USE_VIDEOS = false;

function headline(tier: CelebrationTier, streak: number, lang: Lang): string {
  if (tier === "epic") {
    return lang === "el" ? `${streak} ΜΕΡΕΣ ΣΕΡΙ` : `${streak}-DAY STREAK`;
  }
  if (tier === "streak") {
    return lang === "el" ? `${streak} μέρες σερί` : `${streak}-day streak`;
  }
  return lang === "el" ? "Μπήκες!" : "You're in!";
}

function subline(tier: CelebrationTier, lang: Lang): string {
  if (tier === "epic")
    return lang === "el" ? "🔥 Θηρίο. Μην σταματάς." : "🔥 Beast mode. Don't stop.";
  if (tier === "streak")
    return lang === "el" ? "🔥 Κράτα το σερί!" : "🔥 Keep it alive!";
  return lang === "el" ? "✓ Check-in έτοιμο" : "✓ Checked in";
}

const PALETTES: Record<CelebrationTier, string[]> = {
  base: ["#d4a017", "#ffffff", "#fbbf24", "#f43f5e", "#34d399"],
  streak: ["#f97316", "#fbbf24", "#ef4444", "#d4a017", "#fde68a"],
  epic: ["#d4a017", "#fde047", "#ffffff", "#f59e0b", "#fff7cc"],
};

export function CelebrationOverlay({
  tier,
  streak,
  lang = "el",
  onClose,
}: {
  tier: CelebrationTier;
  streak: number;
  lang?: Lang;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    void warmUpAudio();
    chimeSuccess();
    if (tier === "epic") {
      // extra cheer for the big one
      setTimeout(() => chimeSuccess(), 220);
      setTimeout(() => chimeSuccess(), 440);
    }
  }, [tier]);

  // particle burst
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    const colors = PALETTES[tier];
    const isUp = tier !== "base"; // streak/epic shoot upward like flames
    const count = tier === "epic" ? 220 : tier === "streak" ? 150 : 110;

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      g: number;
      size: number;
      color: string;
      rot: number;
      vrot: number;
      life: number;
    };

    const cx = W / 2;
    const cy = isUp ? H * 0.85 : H * 0.25;
    const parts: P[] = Array.from({ length: count }).map(() => {
      const ang = isUp
        ? -Math.PI / 2 + (Math.random() - 0.5) * 1.4
        : Math.random() * Math.PI * 2;
      const spd = (isUp ? 9 : 6) * dpr * (0.5 + Math.random());
      return {
        x: cx + (Math.random() - 0.5) * 80 * dpr,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        g: (isUp ? 0.12 : 0.22) * dpr,
        size: (tier === "epic" ? 10 : 8) * dpr * (0.5 + Math.random()),
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });

    let raf = 0;
    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 0.006;
        if (p.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (frame < 260) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => cancelAnimationFrame(raf);
  }, [tier]);

  // auto-dismiss
  useEffect(() => {
    const t = setTimeout(onClose, tier === "epic" ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [tier, onClose]);

  const ring =
    tier === "epic"
      ? "from-amber-500/30"
      : tier === "streak"
      ? "from-orange-500/25"
      : "from-brand/20";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6 cursor-pointer"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(2px)" }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 w-full h-full"
      />
      {USE_VIDEOS && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={`/celebrations/${tier}.mp4`}
          autoPlay
          muted
          playsInline
          className="pointer-events-none fixed inset-0 w-full h-full object-cover opacity-80"
        />
      )}

      <div
        className={`relative z-10 flex flex-col items-center gap-3 bg-gradient-to-br ${ring} to-transparent rounded-3xl px-8 py-10`}
      >
        <div className="text-7xl animate-bounce">
          {tier === "epic" ? "🏆" : tier === "streak" ? "🔥" : "🥊"}
        </div>
        <h1
          className={`font-black tracking-tight ${
            tier === "epic" ? "text-5xl text-amber-300" : "text-4xl text-brand"
          }`}
        >
          {headline(tier, streak, lang)}
        </h1>
        <p className="text-lg text-neutral-200">{subline(tier, lang)}</p>
        <p className="text-xs text-neutral-500 mt-2">
          {lang === "el" ? "πάτα για κλείσιμο" : "tap to dismiss"}
        </p>
      </div>
    </div>
  );
}
