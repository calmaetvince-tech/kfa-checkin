"use client";

import { useEffect } from "react";
import { hasOwnerSession } from "@/lib/owner-session";

const TOKEN_KEY = "kfa-member-token";

export function MemberTokenSaver({ token }: { token: string }) {
  useEffect(() => {
    // Don't claim the device for a member when the gym owner is signed in —
    // admins preview member pages all the time and their phone must keep
    // opening the dashboard.
    if (hasOwnerSession()) return;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore (private mode, etc.)
    }
  }, [token]);
  return null;
}
