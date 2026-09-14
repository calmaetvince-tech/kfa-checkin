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
          className="fixed inset-0 z-[100] flex select-none flex-col items-center justify-center gap-6 overflow-hidden bg-brand-ink px-6"
        >
          {/* Gold bloom behind the panel — depth without touching the code. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120vw] w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,160,23,0.16) 0%, rgba(212,160,23,0.05) 38%, transparent 68%)",
            }}
          />

          <p className="relative font-display text-[11px] tracking-[0.34em] text-brand/80">
            KALLISTIS FIGHT ACADEMY
          </p>

          {/* The code keeps its own pure-white field with a real quiet zone;
              the brand styling lives strictly outside that field, so none of
              it can interfere with a scan. Stops click propagation so a member
              holding the phone up cannot dismiss it by touching the code. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="kfa-qr-in relative"
          >
            <div className="kfa-qr-glow rounded-[28px] bg-white p-5">
              <QrSquare url={url} />
            </div>
            {/* Brackets sit OUTSIDE the white panel. Inside, they would eat
                into the code's quiet zone and cost reads for the sake of
                decoration — gold on black frames it just as well. */}
            <Bracket className="-left-3 -top-3 border-l-[3px] border-t-[3px] rounded-tl-[14px]" />
            <Bracket className="-right-3 -top-3 border-r-[3px] border-t-[3px] rounded-tr-[14px]" />
            <Bracket className="-bottom-3 -left-3 border-b-[3px] border-l-[3px] rounded-bl-[14px]" />
            <Bracket className="-bottom-3 -right-3 border-b-[3px] border-r-[3px] rounded-br-[14px]" />
          </div>

          <div className="relative flex flex-col items-center gap-2">
            <h2 className="font-display text-4xl leading-none tracking-wide text-neutral-50">
              {name}
            </h2>
            <span
              aria-hidden
              className="h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent"
            />
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              {el ? "Δείξε το στην κάμερα" : "Show it to the camera"}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="relative rounded-full border border-brand/40 px-7 py-2.5 text-sm font-semibold text-brand transition active:scale-95"
          >
            {el ? "Κλείσιμο" : "Close"}
          </button>
        </div>
      )}
    </>
  );
}

// Gold corner bracket on the white panel — four of them read as a deliberate
// frame rather than the two-corner tape used elsewhere in the app.
function Bracket({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-7 w-7 border-brand ${className}`}
    />
  );
}

// qrcode.react needs a pixel size, so measure the space actually available
// instead of guessing — a 90vw square would overflow a short landscape screen.
function QrSquare({ url }: { url: string }) {
  const [side, setSide] = useState(280);

  useEffect(() => {
    function measure() {
      // Leaves room for the wordmark, name and close button at every height.
      const s = Math.floor(
        Math.min(window.innerWidth * 0.78, window.innerHeight * 0.52)
      );
      setSide(Math.max(170, s));
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  // marginSize keeps the mandatory quiet zone inside the SVG itself, so the
  // code stays scannable no matter what the surrounding panel does.
  return (
    <QRCodeSVG
      value={url}
      size={side}
      level="M"
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#000000"
    />
  );
}
