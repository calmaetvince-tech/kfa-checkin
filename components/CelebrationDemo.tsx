"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CelebrationOverlay } from "./CelebrationOverlay";

// Preview a celebration video by opening the member view with
// ?celebrate=first|second|third (or 1|2|3) — no real scan needed.
const DEMO: Record<string, string> = {
  first: "/celebrations/first.mp4",
  "1": "/celebrations/first.mp4",
  second: "/celebrations/second.mp4",
  "2": "/celebrations/second.mp4",
  third: "/celebrations/third.mp4",
  "3": "/celebrations/third.mp4",
};

export function CelebrationDemo() {
  const sp = useSearchParams();
  const key = (sp.get("celebrate") ?? "").toLowerCase();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO[key]) setSrc(DEMO[key]);
  }, [key]);

  if (!src) return null;
  return <CelebrationOverlay src={src} onClose={() => setSrc(null)} />;
}
