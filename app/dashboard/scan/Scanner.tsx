"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordCheckIn, type CheckInResult } from "./actions";
import { statusLabel, fmtDateTime } from "@/lib/format";
import {
  chimeSuccess,
  chimeWarn,
  chimeError,
  warmUpAudio,
} from "@/lib/feedback";

type Status = "idle" | "scanning" | "processing";

export function Scanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const handleDecoded = useCallback(
    async (payload: string) => {
      // Debounce repeated decodes of the same QR
      const now = Date.now();
      if (
        lastPayloadRef.current &&
        lastPayloadRef.current.value === payload &&
        now - lastPayloadRef.current.at < 4000
      ) {
        return;
      }
      lastPayloadRef.current = { value: payload, at: now };

      setStatus("processing");
      await stop();
      const res = await recordCheckIn(payload);
      // Audio + haptic feedback so the owner doesn't have to look at the screen
      if (!res.ok) {
        chimeError();
      } else {
        const expiresAt = res.member.subscription_expires_at;
        const isActive = expiresAt && new Date(expiresAt).getTime() > Date.now();
        if (isActive) chimeSuccess();
        else chimeWarn();
      }
      setResult(res);
      setStatus("idle");
    },
    [stop]
  );

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setStatus("scanning");
    // Unlock the AudioContext on user gesture (browsers require this)
    void warmUpAudio();
    try {
      const mod = await import("html5-qrcode");
      const html5Qr = new mod.Html5Qrcode("qr-reader");
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          void handleDecoded(decoded);
        },
        () => {
          // ignore decode failures per frame
        }
      );
    } catch (e: any) {
      setStatus("idle");
      setError(e?.message ?? "Couldn't start camera");
    }
  }, [handleDecoded]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div
          id="qr-reader"
          className="w-full aspect-square bg-black rounded-xl overflow-hidden"
        />
        <div className="flex gap-2">
          {status !== "scanning" ? (
            <button onClick={start} className="btn-primary flex-1">
              {status === "processing" ? "Logging…" : "📷 Start camera"}
            </button>
          ) : (
            <button onClick={() => void stop().then(() => setStatus("idle"))} className="btn-ghost flex-1">
              Stop
            </button>
          )}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      {result && <ResultCard result={result} onScanAgain={() => start()} />}
    </div>
  );
}

function ResultCard({
  result,
  onScanAgain,
}: {
  result: CheckInResult;
  onScanAgain: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="card border-rose-300">
        <p className="text-lg font-semibold text-rose-600">❌ {result.error}</p>
        <button onClick={onScanAgain} className="btn-ghost mt-3">
          Scan again
        </button>
      </div>
    );
  }
  const s = statusLabel(result.member.subscription_expires_at);
  return (
    <div className={`card ${s.tone === "ok" ? "border-emerald-300" : s.tone === "warn" ? "border-amber-300" : "border-rose-300"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">Checked in</p>
          <p className="text-xl font-bold">{result.member.name}</p>
        </div>
        <span className={`badge-${s.tone}`}>{s.label}</span>
      </div>
      <div className="mt-3 text-sm">
        <p>
          Visits this month:{" "}
          <span className="font-semibold">{result.visitsThisMonth}</span>
        </p>
        <p className="text-xs text-neutral-500">
          At {fmtDateTime(result.lastVisitAt)}
        </p>
      </div>
      <button onClick={onScanAgain} className="btn-primary mt-3 w-full">
        Scan next
      </button>
    </div>
  );
}
