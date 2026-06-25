"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CelebrationOverlay,
  type CelebrationTier,
} from "./CelebrationOverlay";

// Lets the owner preview each celebration tier by opening the member view with
// ?celebrate=base|streak|epic — no real scan needed.
const SAMPLE: Record<string, { tier: CelebrationTier; streak: number }> = {
  base: { tier: "base", streak: 1 },
  streak: { tier: "streak", streak: 3 },
  epic: { tier: "epic", streak: 7 },
};

export function CelebrationDemo({ lang = "el" }: { lang?: "el" | "en" }) {
  const sp = useSearchParams();
  const key = sp.get("celebrate") ?? "";
  const [show, setShow] = useState<{
    tier: CelebrationTier;
    streak: number;
  } | null>(null);

  useEffect(() => {
    if (SAMPLE[key]) setShow(SAMPLE[key]);
  }, [key]);

  if (!show) return null;
  return (
    <CelebrationOverlay
      tier={show.tier}
      streak={show.streak}
      lang={lang}
      onClose={() => setShow(null)}
    />
  );
}
