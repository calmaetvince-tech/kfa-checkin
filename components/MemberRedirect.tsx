"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasOwnerSession } from "@/lib/owner-session";

const TOKEN_KEY = "kfa-member-token";

export function MemberRedirect() {
  const router = useRouter();
  const sp = useSearchParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Owner explicitly wants the landing page → skip
    if (sp.get("owner") === "1") {
      setChecked(true);
      return;
    }
    // Signed-in owner device → this is the admin's phone; go to the dashboard
    // (takes priority over any member token saved while previewing members).
    if (hasOwnerSession()) {
      router.replace("/dashboard");
      return;
    }
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    if (token) {
      router.replace(`/m/${token}`);
    } else {
      setChecked(true);
    }
  }, [router, sp]);

  // Show nothing until we've decided whether to redirect, to avoid a flash
  if (!checked) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }
  return null;
}
