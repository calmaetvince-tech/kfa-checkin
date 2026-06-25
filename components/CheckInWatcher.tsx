"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CelebrationOverlay } from "./CelebrationOverlay";

const POLL_MS = 3000;

// 1st scan → first, 2nd → second, 3rd and beyond → third.
export function videoForScan(n: number): string {
  if (n <= 1) return "/celebrations/first.mp4";
  if (n === 2) return "/celebrations/second.mp4";
  return "/celebrations/third.mp4";
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 820px)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

// Lives on the member's open QR page. Polls the visit count; when it ticks up
// (the owner just scanned them) it plays the celebration video for that scan
// number. Mobile only.
export function CheckInWatcher({
  token,
  initialVisits,
}: {
  token: string;
  memberId: string;
  initialVisits: number;
  lang?: "el" | "en";
}) {
  const lastCount = useRef(initialVisits);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile()) return;
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
        setSrc(videoForScan(count));
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  if (!src) return null;
  return <CelebrationOverlay src={src} onClose={() => setSrc(null)} />;
}
