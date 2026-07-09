"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordCheckIn, type CheckInResult } from "../scan/actions";
import { statusLabel, fmtTime } from "@/lib/format";
import {
  chimeSuccess,
  chimeWarn,
  chimeError,
  warmUpAudio,
} from "@/lib/feedback";

// Captures input from a hardware USB/Bluetooth QR scanner. These devices act
// as a keyboard: they "type" the scanned string very fast (a few ms between
// characters) and finish with Enter. We buffer keystrokes and reset the
// buffer if there's a human-speed gap, so nobody can "type" a fake check-in
// by hand — only a real scanner burst completes a scan.
const MAX_GAP_MS = 60;
const RESULT_DISPLAY_MS = 4500;

export function KioskScanner() {
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const bufferRef = useRef("");
  const lastKeyTime = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = useCallback(async (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (
      lastPayloadRef.current &&
      lastPayloadRef.current.value === trimmed &&
      now - lastPayloadRef.current.at < 4000
    ) {
      return; // debounce accidental double-reads of the same card
    }
    lastPayloadRef.current = { value: trimmed, at: now };

    void warmUpAudio();
    setStatus("processing");
    const res = await recordCheckIn(trimmed);

    if (!res.ok) {
      chimeError();
    } else {
      const active =
        res.member.subscription_expires_at &&
        new Date(res.member.subscription_expires_at).getTime() > Date.now();
      if (active) chimeSuccess();
      else chimeWarn();
    }

    setResult(res);
    setStatus("idle");

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setResult(null), RESULT_DISPLAY_MS);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Human-speed gap → this is not a scanner burst, start fresh.
      if (gap > MAX_GAP_MS) bufferRef.current = "";

      if (e.key === "Enter" || e.key === "Tab") {
        if (bufferRef.current.length >= 8) {
          const payload = bufferRef.current;
          bufferRef.current = "";
          void submit(payload);
        }
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    focusInput();
    const refocus = setInterval(focusInput, 1500);
    window.addEventListener("focus", focusInput);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focus", focusInput);
      clearInterval(refocus);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [focusInput, submit]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-brand-ink px-8 text-center">
      {/* invisible always-focused input so the scanner's keystrokes land here
          even though nothing on screen is clickable */}
      <input
        ref={inputRef}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        autoFocus
        onBlur={focusInput}
      />

      {!result && (
        <>
          <div
            className={`h-40 w-40 rounded-full border-4 border-brand/40 flex items-center justify-center ${
              status === "processing" ? "" : "animate-pulse"
            }`}
          >
            <span className="text-6xl">🥊</span>
          </div>
          <h1 className="font-display text-4xl tracking-widest text-brand">
            {status === "processing" ? "…" : "ΣΑΡΩΣΕ ΤΟ QR"}
          </h1>
          <p className="text-neutral-500 text-sm">
            Kallistis Fight Academy · Check-in
          </p>
        </>
      )}

      {result && <KioskResult result={result} />}
    </div>
  );
}

function KioskResult({ result }: { result: CheckInResult }) {
  if (!result.ok) {
    return (
      <div className="flex flex-col items-center gap-4">
        <span className="text-7xl">❌</span>
        <h1 className="font-display text-3xl text-rose-400">
          {result.error}
        </h1>
      </div>
    );
  }

  const s = statusLabel(result.member.subscription_expires_at);
  const color =
    s.tone === "ok"
      ? "text-emerald-400"
      : s.tone === "warn"
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-7xl">{s.tone === "ok" ? "✅" : "⚠️"}</span>
      <h1 className="font-display text-5xl tracking-wide">
        {result.member.name}
      </h1>
      <p className={`font-display text-2xl tracking-widest ${color}`}>
        {s.label}
      </p>
      <p className="text-neutral-500 text-sm">
        {result.visitsThisMonth} επισκέψεις τον μήνα ·{" "}
        {fmtTime(result.lastVisitAt)}
      </p>
    </div>
  );
}
