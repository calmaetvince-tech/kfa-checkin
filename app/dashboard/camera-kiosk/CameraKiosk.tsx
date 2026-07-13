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
// screen awake so the camera never sleeps, and only the camera-flip control is
// tappable so members can't wander into the dashboard.
const RESULT_DISPLAY_MS = 3500;

type Facing = "environment" | "user";

export function CameraKiosk() {
  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // Non-fatal: some browsers block it; kiosk still works, screen may dim.
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

  // Start / restart the camera whenever the station is on or the facing flips.
  // Runs AFTER render, so the #kiosk-qr-reader container is already visible —
  // html5-qrcode can't attach video to a hidden (display:none) element, which
  // is why starting the camera inline on the click showed no video.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    let instance: any = null;

    (async () => {
      setError(null);
      void warmUpAudio();
      void acquireWakeLock();
      try {
        const mod = await import("html5-qrcode");
        const html5Qr = new mod.Html5Qrcode("kiosk-qr-reader");
        instance = html5Qr;
        await html5Qr.start(
          { facingMode: facing },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => void handleDecoded(decoded),
          () => {}
        );
        if (cancelled) {
          try {
            await html5Qr.stop();
          } catch {}
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Δεν άνοιξε η κάμερα. Δοκίμασε την άλλη κάμερα ή δώσε άδεια."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (instance) {
        try {
          instance.stop().catch(() => {});
        } catch {}
      }
    };
  }, [started, facing, handleDecoded, acquireWakeLock]);

  // Re-acquire the wake lock if the OS drops it (tab regains focus).
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
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
      }
    };
  }, []);

  const flipCamera = () =>
    setFacing((f) => (f === "environment" ? "user" : "environment"));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-brand-ink px-6 text-center">
      {/* One-time start: camera + audio + wake-lock all need a user gesture. */}
      {!started && (
        <div className="flex flex-col items-center gap-5">
          <span className="text-6xl">📷</span>
          <h1 className="font-display text-3xl tracking-widest text-brand">
            KFA CHECK-IN
          </h1>
          <button
            onClick={() => setStarted(true)}
            className="btn-primary px-8 py-3 text-lg"
          >
            Ξεκίνα τον σταθμό
          </button>
          <p className="max-w-xs text-xs text-neutral-500">
            Πάτησε μία φορά για να ανοίξει η κάμερα. Μετά άφησέ το ανοιχτό στη
            ρεσεψιόν — τα μέλη σκανάρουν μόνα τους.
          </p>
        </div>
      )}

      {/* Camera view is mounted only once started, so the container is visible
          before the effect calls start(). Result card overlays on top. */}
      {started && (
        <div className="flex flex-col items-center gap-4">
          <div
            id="kiosk-qr-reader"
            className="h-64 w-64 overflow-hidden rounded-2xl bg-black corners"
          />
          {!result && !error && (
            <>
              <h1 className="font-display text-3xl tracking-widest text-brand">
                ΔΕΙΞΕ ΤΟ QR ΣΟΥ
              </h1>
              <p className="text-sm text-neutral-500">
                Kallistis Fight Academy
              </p>
            </>
          )}
          {error && (
            <p className="max-w-xs text-sm text-rose-400">{error}</p>
          )}
          {/* Small setup control — flip between back and front camera. */}
          <button
            onClick={flipCamera}
            className="btn-ghost mt-1 text-sm"
          >
            🔄 {facing === "environment" ? "Πίσω κάμερα" : "Μπροστινή κάμερα"}
          </button>
        </div>
      )}

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
