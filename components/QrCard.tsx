"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// The member's QR, tappable to fill the screen. A phone held at arm's length
// from a reception camera gives it a small target; blowing the code up to the
// full width of a white screen is the single biggest thing that makes the scan
// instant. Also holds a wake lock so the screen cannot dim mid-scan, which is
// what actually breaks reads on a phone with aggressive power saving.
export function QrCard({
  url,
  name,
  lang,
}: {
  url: string;
  name: string;
  lang: "el" | "en";
}) {
  const [open, setOpen] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const el = lang === "el";

  const release = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<any> };
        };
        if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
      } catch {
        // Screen may dim; the QR is still readable.
      }
    })();

    // Escape closes on a laptop; the whole overlay is tappable on a phone.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      release();
    };
  }, [open, release]);

  // Re-acquire if the OS drops the lock when the tab loses and regains focus.
  useEffect(() => {
    if (!open) return;
    async function onVisible() {
      if (document.visibilityState !== "visible" || wakeLockRef.current) return;
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<any> };
        };
        if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
      } catch {}
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [open]);

  return (
    <>
      <section className="card flex flex-col gap-3 items-center">
        <p className="text-xs text-neutral-500">
          {el ? "Δείξε το στη ρεσεψιόν" : "Show this at the front desk"}
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={el ? "Άνοιγμα QR σε πλήρη οθόνη" : "Open QR full screen"}
          className="corners rounded-xl bg-white p-4 transition active:scale-[0.98]"
        >
          <QRCodeSVG value={url} size={220} />
        </button>

        <p className="text-[11px] font-semibold text-brand">
          {el ? "👆 Πάτησέ το για πλήρη οθόνη" : "👆 Tap it for full screen"}
        </p>

        <p className="text-xs text-neutral-500 text-center">
          {el
            ? "Πρόσθεσε τη σελίδα στην αρχική οθόνη"
            : "Add this page to your phone's home screen"}
          <br />
          <span className="text-neutral-600">
            {el ? "(Κοινή χρήση → Στην αρχική οθόνη)" : "(Share → Add to Home Screen)"}
          </span>
        </p>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={el ? "QR πλήρους οθόνης" : "Full screen QR"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-white p-4"
        >
          {/* Pure white behind the code and the largest square that fits, so a
              reception camera gets maximum contrast and target size. */}
          <QrSquare url={url} />

          <p className="font-display text-2xl tracking-wide text-neutral-900">
            {name}
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white active:scale-95"
          >
            {el ? "Κλείσιμο" : "Close"}
          </button>
        </div>
      )}
    </>
  );
}

// qrcode.react needs a pixel size, so measure the space actually available
// instead of guessing — a 90vw square would overflow a short landscape screen.
function QrSquare({ url }: { url: string }) {
  const [side, setSide] = useState(280);

  useEffect(() => {
    function measure() {
      const s = Math.floor(
        Math.min(window.innerWidth * 0.9, window.innerHeight * 0.62)
      );
      setSide(Math.max(180, s));
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return <QRCodeSVG value={url} size={side} level="M" />;
}
