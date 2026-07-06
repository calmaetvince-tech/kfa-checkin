"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { RankUpOverlay } from "./RankUpOverlay";
import { RANKS } from "@/lib/rank";

// Preview celebrations by opening the member view with
// ?celebrate=first|second|third (scan videos) or ?celebrate=rankup
// (shareable rank-up card). No real scan needed.
const DEMO: Record<string, string> = {
  first: "/celebrations/first.mp4",
  "1": "/celebrations/first.mp4",
  second: "/celebrations/second.mp4",
  "2": "/celebrations/second.mp4",
  third: "/celebrations/third.mp4",
  "3": "/celebrations/third.mp4",
};

export function CelebrationDemo({
  name = "Fighter",
  lang = "el",
}: {
  name?: string;
  lang?: "el" | "en";
}) {
  const sp = useSearchParams();
  const key = (sp.get("celebrate") ?? "").toLowerCase();
  const [src, setSrc] = useState<string | null>(null);
  const [rankUp, setRankUp] = useState(false);

  useEffect(() => {
    if (DEMO[key]) setSrc(DEMO[key]);
    else if (key === "rankup") setRankUp(true);
  }, [key]);

  if (src) return <CelebrationOverlay src={src} onClose={() => setSrc(null)} />;
  if (rankUp)
    return (
      <RankUpOverlay
        name={name}
        rank={RANKS[2]} // ⚔️ WARRIOR sample
        lang={lang}
        onClose={() => setRankUp(false)}
      />
    );
  return null;
}
