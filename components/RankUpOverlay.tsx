"use client";

import { useEffect, useRef, useState } from "react";
import type { Rank } from "@/lib/rank";
import { chimeSuccess, warmUpAudio } from "@/lib/feedback";

// Full-screen "NEW RANK" moment + a canvas-generated 1080x1920 achievement
// card the member can share straight to Instagram Stories / WhatsApp status.
export function RankUpOverlay({
  name,
  rank,
  lang,
  onClose,
}: {
  name: string;
  rank: Rank;
  lang: "el" | "en";
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [shared, setShared] = useState(false);

  const rankName = lang === "el" ? rank.el : rank.en;
  const firstName = name.trim().split(/\s+/)[0];

  useEffect(() => {
    void warmUpAudio();
    chimeSuccess();
    setTimeout(() => chimeSuccess(), 250);
  }, []);

  // draw the shareable card
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // resolve the real (next/font-mangled) Bebas family from the DOM
    const probe = document.createElement("span");
    probe.className = "font-display";
    document.body.appendChild(probe);
    const displayFamily = getComputedStyle(probe).fontFamily;
    probe.remove();

    const logo = new Image();
    logo.src = "/brand/kfa-logo-square.png";
    logo.onload = () => {
      // background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W / 2, 700, 60, W / 2, 700, 800);
      glow.addColorStop(0, "rgba(212,160,23,0.28)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // gold bars
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(0, 0, W, 16);
      ctx.fillRect(0, H - 16, W, 16);

      // corner brackets
      ctx.strokeStyle = "#d4a017";
      ctx.lineWidth = 8;
      const c = 90, m = 60;
      ctx.beginPath();
      ctx.moveTo(m, m + c); ctx.lineTo(m, m); ctx.lineTo(m + c, m);
      ctx.moveTo(W - m, H - m - c); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m - c, H - m);
      ctx.stroke();

      // logo (screen-blend the black box away)
      const lw = 460;
      const lh = lw * (logo.height / logo.width);
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(logo, (W - lw) / 2, 130, lw, lh);
      ctx.globalCompositeOperation = "source-over";

      ctx.textAlign = "center";

      // kicker
      ctx.fillStyle = "#d4a017";
      ctx.font = `700 44px ${displayFamily}`;
      ctx.fillText(lang === "el" ? "Ν Ε Ο   Ε Π Ι Π Ε Δ Ο" : "N E W   R A N K", W / 2, 900);

      // rank icon
      ctx.font = "230px serif";
      ctx.fillText(rank.icon, W / 2, 1180);

      // rank name
      ctx.fillStyle = "#ffffff";
      ctx.font = `400 190px ${displayFamily}`;
      ctx.fillText(rankName, W / 2, 1400);

      // member + brand
      ctx.fillStyle = "#9a9a9a";
      ctx.font = `600 52px ${displayFamily}`;
      ctx.fillText(firstName.toUpperCase(), W / 2, 1520);

      ctx.fillStyle = "#d4a017";
      ctx.font = `400 40px ${displayFamily}`;
      ctx.fillText("KALLISTIS FIGHT ACADEMY", W / 2, 1750);
      ctx.fillStyle = "#666";
      ctx.font = "28px sans-serif";
      ctx.fillText("app.kallistisfightacademy.com", W / 2, 1800);

      setReady(true);
    };
  }, [rank, rankName, firstName, lang]);

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "kfa-rank.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file] });
          setShared(true);
          return;
        } catch {
          /* cancelled */
        }
      }
      // fallback: download
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "kfa-rank.png";
      a.click();
      setShared(true);
    }, "image/png");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(4px)" }}
    >
      <p className="font-display text-2xl tracking-widest text-brand animate-pulse">
        {lang === "el" ? "ΝΕΟ ΕΠΙΠΕΔΟ!" : "NEW RANK!"}
      </p>

      <canvas
        ref={canvasRef}
        className="corners rounded-xl max-h-[62vh] w-auto"
        style={{ aspectRatio: "1080/1920" }}
      />

      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={onClose} className="btn-ghost flex-1">
          {lang === "el" ? "Κλείσιμο" : "Close"}
        </button>
        <button
          onClick={share}
          disabled={!ready}
          className="btn-primary flex-1"
        >
          {shared
            ? lang === "el" ? "✓ Έγινε" : "✓ Done"
            : lang === "el" ? "📤 Μοιράσου το" : "📤 Share it"}
        </button>
      </div>
    </div>
  );
}
