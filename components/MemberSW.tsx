"use client";

import { useEffect } from "react";

// Registers the offline service worker so the member's QR page (and its
// assets) keep opening inside the gym even with zero signal.
export function MemberSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
