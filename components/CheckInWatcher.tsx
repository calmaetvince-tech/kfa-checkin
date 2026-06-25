"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CelebrationOverlay,
  type CelebrationTier,
} from "./CelebrationOverlay";

const STREAK_TIER = 3; // flames
const EPIC_TIER = 7; // gold explosion
const POLL_MS = 3000;

function tierFor(streak: number): CelebrationTier {
  if (streak >= EPIC_TIER) return "epic";
  if (streak >= STREAK_TIER) return "streak";
  return "base";
}

// Lives on the member's open QR page. Polls the visit count; when it ticks up
// (the owner just scanned them), it looks up the resulting streak and fires the
// matching celebration. No realtime/RLS plumbing needed.
export function CheckInWatcher({
  token,
  memberId,
  initialVisits,
  lang = "el",
}: {
  token: string;
  memberId: string;
  initialVisits: number;
  lang?: "el" | "en";
}) {
  const lastCount = useRef(initialVisits);
  const [celebration, setCelebration] = useState<{
    tier: CelebrationTier;
    streak: number;
  } | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function tick() {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase.rpc("get_member_visit_count", {
        p_token: token,
      });
      if (cancelled || error || data == null) return;
      const count = Number(data);
      if (count > lastCount.current) {
        lastCount.current = count;
        // a check-in just happened — get the new streak to pick the tier
        const { data: s } = await supabase.rpc("get_member_streak", {
          p_member_id: memberId,
        });
        const streak =
          (s as { current_streak_days: number }[] | null)?.[0]
            ?.current_streak_days ?? 1;
        if (!cancelled) setCelebration({ tier: tierFor(streak), streak });
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, memberId]);

  if (!celebration) return null;
  return (
    <CelebrationOverlay
      tier={celebration.tier}
      streak={celebration.streak}
      lang={lang}
      onClose={() => setCelebration(null)}
    />
  );
}
