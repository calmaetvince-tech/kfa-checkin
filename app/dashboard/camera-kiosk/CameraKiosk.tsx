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

// Unattended self-service check-in on a fixed phone/tablet at reception.
// A member holds their QR up to the camera; we log the check-in, flash their
// name for a few seconds, then loop back to scanning automatically. Keeps the
// screen awake so the camera never sleeps, and nothing on screen is tappable
// so members can't wander into the dashboard.
const RESULT_DISPLAY_MS = 3500;

export function CameraKiosk() {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);
  const wakeLockRef = useRef<any>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<any> };
      };
      if (nav.wakeLock) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      }
    } catch {
      // Non-fatal: some browsers block it; the kiosk still works, screen may dim.
    }
  }, []);

  const handleDecoded = useCallback(async (payload: string) => {
    if (pausedRef.current) return; // showing a result — ignore extra frames

    const now = Date.now();
    if (
      lastPayloadRef.current &&
      lastPayloadRef.current.value === payload &&
      now - lastPayloadRef.current.at < 4000
    ) {
      return; // debounce repeated decodes of the same QR held in view
    }
    lastPayloadRef.current = { value: payload, at: now };
    pausedRef.current = true;

    void warmUpAudio();
    const res = await recordCheckIn(payload);

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
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setResult(null);
      pausedRef.current = false; // resume scanning for the next member
    }, RESULT_DISPLAY_MS);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    void warmUpAudio();
    void acquireWakeLock();
    try {
      const mod = await import("html5-qrcode");
      const html5Qr = new mod.Html5Qrcode("kiosk-qr-reader");
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => void handleDecoded(decoded),
        () => {}
      );
      setStarted(true);
    } catch (e: any) {
      setError(e?.message ?? "Δεν άνοιξε η κάμερα");
    }
  }, [acquireWakeLock, handleDecoded]);

  // Re-acquire the wake lock if the OS drops it (e.g. tab regains focus).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && started) {
        void acquireWakeLock();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquireWakeLock, started]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {}
      }
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-brand-ink px-6 text-center">
      {/* One-time start button: camera + audio + wake-lock all need a user
          gesture to unlock. After this tap the station runs itself. */}
      {!started && (
        <div className="flex flex-col items-center gap-5">
          <span className="text-6xl">📷</span>
          <h1 className="font-display text-3xl tracking-widest text-brand">
            KFA CHECK-IN
          </h1>
          <button onClick={start} className="btn-primary px-8 py-3 text-lg">
            Ξεκίνα τον σταθμό
          </button>
          <p className="max-w-xs text-xs text-neutral-500">
            Πάτησε μία φορά για να ανοίξει η κάμερα. Μετά άφησέ το ανοιχτό στη
            ρεσεψιόν — τα μέλη σκανάρουν μόνα τους.
          </p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
      )}

      {/* The camera viewport is always mounted once started; we just overlay
          the result card on top of it when someone checks in. */}
      <div
        className={started ? "flex flex-col items-center gap-4" : "hidden"}
      >
        <div
          id="kiosk-qr-reader"
          className="h-64 w-64 overflow-hidden rounded-2xl bg-black corners"
        />
        {!result && (
          <>
            <h1 className="font-display text-3xl tracking-widest text-brand">
              ΔΕΙΞΕ ΤΟ QR ΣΟΥ
            </h1>
            <p className="text-sm text-neutral-500">
              Kallistis Fight Academy
            </p>
          </>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      {result && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-brand-ink px-6">
          <KioskResult result={result} />
        </div>
      )}
    </div>
  );
}

function KioskResult({ result }: { result: CheckInResult }) {
  if (!result.ok) {
    return (
      <>
        <span className="text-7xl">❌</span>
        <h1 className="font-display text-3xl text-rose-400">{result.error}</h1>
      </>
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
    <>
      <span className="text-7xl">{s.tone === "ok" ? "✅" : "⚠️"}</span>
      <h1 className="font-display text-5xl tracking-wide">
        {result.member.name}
      </h1>
      <p className={`font-display text-2xl tracking-widest ${color}`}>
        {s.label}
      </p>
      <p className="text-sm text-neutral-500">
        {result.visitsThisMonth} επισκέψεις τον μήνα · {fmtTime(result.lastVisitAt)}
      </p>
    </>
  );
}
