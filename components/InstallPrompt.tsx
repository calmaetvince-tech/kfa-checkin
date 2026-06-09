"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Win|Mac|Linux/.test(ua)) return "desktop";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  if ((window.navigator as any).standalone === true) return true;
  // Other browsers
  return window.matchMedia("(display-mode: standalone)").matches;
}

const DISMISS_KEY = "kfa-install-dismissed";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setPlatform(detectPlatform());
    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <section className="card border-brand/40 bg-gradient-to-br from-neutral-900 to-neutral-950 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand">
            Install KFA on your phone
          </p>
          <h2 className="text-lg font-bold">Add to Home Screen</h2>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-neutral-500 hover:text-neutral-300 text-xl leading-none px-2"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-neutral-400">
        One tap to open your QR. Works offline. No App Store needed.
      </p>
      <p className="text-xs text-amber-300 bg-amber-950/40 rounded p-2">
        ⚠️ Install <strong>from this page</strong> (not the landing page) so the
        icon opens straight to your QR.
      </p>

      {platform === "ios" && <IosSteps />}
      {platform === "android" && <AndroidSteps />}
      {(platform === "desktop" || platform === "other") && <GenericSteps />}

      <button
        onClick={dismiss}
        className="text-xs text-neutral-500 underline self-start mt-1"
      >
        I&apos;ve done it — hide this
      </button>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-brand-ink font-bold text-xs flex items-center justify-center">
        {n}
      </span>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  );
}

function IosSteps() {
  return (
    <ol className="flex flex-col gap-2.5 mt-1">
      <Step n={1}>
        Tap the <strong>Share</strong> button{" "}
        <span aria-hidden className="inline-block px-1.5 py-0.5 bg-neutral-800 rounded text-xs">
          ⬆
        </span>{" "}
        at the bottom of Safari.
      </Step>
      <Step n={2}>
        Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
      </Step>
      <Step n={3}>
        Tap <strong>Add</strong> in the top right.
      </Step>
      <p className="text-xs text-neutral-500 mt-1 pl-9">
        ⚠️ Must be Safari — Chrome on iPhone can&apos;t install web apps.
      </p>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="flex flex-col gap-2.5 mt-1">
      <Step n={1}>
        Tap the <strong>⋮ menu</strong> at the top right of Chrome.
      </Step>
      <Step n={2}>
        Tap <strong>&ldquo;Install app&rdquo;</strong> (or &ldquo;Add to Home screen&rdquo;).
      </Step>
      <Step n={3}>
        Tap <strong>Install</strong> to confirm.
      </Step>
    </ol>
  );
}

function GenericSteps() {
  return (
    <div className="flex flex-col gap-3 mt-1">
      <div>
        <p className="text-sm font-medium text-neutral-300">📱 On iPhone (Safari):</p>
        <ol className="flex flex-col gap-1 mt-1 pl-1">
          <Step n={1}>Tap the <strong>Share</strong> button.</Step>
          <Step n={2}>Tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</Step>
        </ol>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-300">🤖 On Android (Chrome):</p>
        <ol className="flex flex-col gap-1 mt-1 pl-1">
          <Step n={1}>Tap the <strong>⋮ menu</strong>.</Step>
          <Step n={2}>Tap <strong>&ldquo;Install app&rdquo;</strong>.</Step>
        </ol>
      </div>
    </div>
  );
}
