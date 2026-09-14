"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordCheckIn, type CheckInResult } from "../scan/actions";
import { statusLabel, fmtTime } from "@/lib/format";
import { rankFor } from "@/lib/rank";
import { preloadScanner, startScanner, type Facing } from "@/lib/qr-scanner";
import {
  chimeSuccess,
  chimeWarn,
  chimeError,
  warmUpAudio,
} from "@/lib/feedback";

// Unattended self-service check-in on a fixed phone/tablet at reception.
// A member holds their QR up to the camera; we log the check-in, flash their
// name for a couple of seconds, then loop back to scanning automatically. Keeps
// the screen awake so the camera never sleeps, and only the camera-flip control
// is tappable so members can't wander into the dashboard.
const RESULT_DISPLAY_MS = 3000;

export function CameraKiosk() {
  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);
  const wakeLockRef = useRef<any>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  // Fetch the scanner chunk while the owner is still reading the start screen,
  // so the tap itself only has to open the camera.
  useEffect(() => {
    preloadScanner();
  }, []);

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
    let stop: (() => Promise<void>) | null = null;

    (async () => {
      setError(null);
      void warmUpAudio();
      void acquireWakeLock();
      try {
        const stopFn = await startScanner({
          elementId: "kiosk-qr-reader",
          facing,
          onDecode: (decoded) => void handleDecoded(decoded),
        });
        stop = stopFn;
        if (cancelled) void stopFn();
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
      if (stop) void stop();
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
        <div className="flex w-full flex-col items-center gap-4">
          {/* Fills the short side of the screen (capped so the heading below
              still fits) — members aim from a metre away, so the viewfinder
              needs to be as big as the device allows, not a 256px thumbnail. */}
          <div
            id="kiosk-qr-reader"
            className="aspect-square w-[min(88vw,62vh)] overflow-hidden rounded-2xl bg-black corners"
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden bg-brand-ink px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[130vw] w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,160,23,0.14) 0%, rgba(212,160,23,0.04) 40%, transparent 70%)",
            }}
          />
          <KioskResult result={result} />
        </div>
      )}
    </div>
  );
}

function KioskResult({ result }: { result: CheckInResult }) {
  if (!result.ok) {
    return (
      <div className="kfa-hit flex flex-col items-center gap-4 text-center">
        <span className="text-7xl">❌</span>
        <h1 className="font-display text-3xl tracking-wide text-rose-400">
          {result.error}
        </h1>
        <p className="text-sm text-neutral-500">
          Δοκίμασε ξανά ή ρώτησε στη ρεσεψιόν
        </p>
      </div>
    );
  }

  const s = statusLabel(result.member.subscription_expires_at);
  const active = s.tone === "ok";
  const r = rankFor(result.totalVisits);

  // Gold for a valid membership, amber when it is running out — the colour is
  // the message across the room, before anyone reads a word.
  const accent = active ? "#d4a017" : "#f59e0b";

  return (
    <div className="relative flex w-full max-w-sm flex-col items-center gap-5 text-center">
      {/* Ring pulse from behind the portrait, once, on arrival. */}
      <span
        aria-hidden
        className="kfa-ring pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: accent }}
      />

      <div className="kfa-hit relative">
        <KioskPortrait
          memberId={result.member.id}
          name={result.member.name}
          photoVersion={result.member.photo_updated_at}
          accent={accent}
        />
        <span
          className="absolute -bottom-1 -right-1 grid h-11 w-11 place-items-center rounded-full border-2 text-xl"
          style={{ borderColor: accent, background: "#0a0a0a" }}
          title={r.rank.el}
        >
          {active ? r.rank.icon : "⚠️"}
        </span>
      </div>

      <div className="kfa-rise flex flex-col items-center gap-1">
        <p
          className="font-display text-xs tracking-[0.34em]"
          style={{ color: accent }}
        >
          {active ? "ΚΑΛΩΣ ΗΡΘΕΣ" : "ΠΡΟΣΟΧΗ"}
        </p>
        <h1 className="font-display text-5xl leading-none tracking-wide">
          {result.member.name}
        </h1>
        <p
          className="font-display text-lg tracking-[0.2em]"
          style={{ color: accent }}
        >
          {r.rank.el}
        </p>
      </div>

      {/* Gold hairline that sweeps across once, like a scanner pass. */}
      <div className="relative h-px w-40 overflow-hidden bg-neutral-800">
        <span
          aria-hidden
          className="kfa-sweep absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      </div>

      <div className="kfa-rise flex items-stretch gap-3">
        <Metric value={result.visitsThisMonth} label="ΤΟΝ ΜΗΝΑ" accent={accent} />
        <Metric value={result.totalVisits} label="ΣΥΝΟΛΟ" />
        {r.next && (
          <Metric value={r.remaining} label={`ΓΙΑ ${r.next.icon}`} />
        )}
      </div>

      <p className="text-xs text-neutral-500">
        {fmtTime(result.lastVisitAt)}
        {!active && ` · ${s.label}`}
      </p>
    </div>
  );
}

/**
 * Portrait for the check-in reaction. Most members have no photo yet and the
 * avatar endpoint answers 404 for them, so a bare <img> would put a broken
 * image on a screen the whole gym walks past. Only request the photo when the
 * database says one exists, and still fall back to monogram initials if that
 * request fails.
 */
function KioskPortrait({
  memberId,
  name,
  photoVersion,
  accent,
}: {
  memberId: string;
  name: string;
  photoVersion: string | null;
  accent: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const showPhoto = Boolean(photoVersion) && !failed;

  return (
    <div
      className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border-[3px] bg-neutral-900"
      style={{ borderColor: accent, boxShadow: `0 0 46px ${accent}55` }}
    >
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/avatar/${memberId}?v=${encodeURIComponent(photoVersion!)}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-display text-5xl leading-none"
          style={{ color: accent }}
        >
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="min-w-[72px] rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2">
      <p
        className="font-display text-3xl leading-none tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[9px] tracking-[0.14em] text-neutral-500">
        {label}
      </p>
    </div>
  );
}
