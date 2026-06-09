"use client";

import { useEffect } from "react";

const TOKEN_KEY = "kfa-member-token";

export function MemberTokenSaver({ token }: { token: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore (private mode, etc.)
    }
  }, [token]);
  return null;
}
