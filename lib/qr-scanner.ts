// Shared camera-QR plumbing for the scan page and the reception kiosk.
//
// What made the camera feel slow:
//   1. html5-qrcode (~200KB) was only imported on the button press, so the
//      first tap paid a network round-trip before any video appeared. We now
//      preload the module as soon as the screen mounts.
//   2. Every frame without a QR in it was decoded twice — once normally, once
//      mirrored — and that is the overwhelming majority of frames. disableFlip
//      skips the second pass.
//   3. The scan loop idled 100ms between frames (fps 10) even on a device that
//      could decode faster.
//
// Note: html5-qrcode already prefers the browser's native BarcodeDetector by
// default; the flag below pins that rather than enabling anything new.

export type Facing = "environment" | "user";

let modPromise: Promise<typeof import("html5-qrcode")> | null = null;

/** Warm the scanner chunk so pressing Start opens the camera immediately. */
export function preloadScanner(): void {
  if (typeof window === "undefined") return;
  modPromise ??= import("html5-qrcode");
  void modPromise.catch(() => {
    modPromise = null; // let a later attempt retry the download
  });
}

/**
 * Start the camera into `elementId` and call `onDecode` for every QR read.
 * Returns a stop function; callers must invoke it on unmount.
 */
export async function startScanner(opts: {
  elementId: string;
  facing: Facing;
  onDecode: (value: string) => void;
}): Promise<() => Promise<void>> {
  modPromise ??= import("html5-qrcode");
  const mod = await modPromise;

  const scanner = new mod.Html5Qrcode(opts.elementId, {
    // Native decoding where the browser has it (this is html5-qrcode's own
    // default — stated explicitly so a future config change can't drop it).
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    verbose: false,
  });

  await scanner.start(
    { facingMode: opts.facing },
    {
      // The scan loop sleeps 1000/fps AFTER each decode finishes, so this is a
      // ceiling, not a workload: a slow phone simply runs flat out. Raising it
      // cuts the idle gap without asking the device for more than it can do.
      fps: 20,
      // The qrbox doubles as the decode canvas — every pixel in it is decoded
      // each frame — so it must NOT simply track the (now much larger)
      // viewfinder, or the kiosk would do ~5x the work per frame. Scale with
      // the viewfinder for aim, but cap it: past ~400px there is no accuracy
      // left to gain, only cost. The dark surround is the usual scanner look.
      qrbox: (w: number, h: number) => {
        const side = Math.min(Math.floor(Math.min(w, h) * 0.8), 400);
        return { width: side, height: side };
      },
      aspectRatio: 1,
      // Members hold the QR the right way up; skipping the mirrored pass
      // halves the per-frame work on the JS fallback path.
      disableFlip: true,
      videoConstraints: {
        facingMode: opts.facing,
        width: { ideal: 1280 },
        height: { ideal: 1280 },
        frameRate: { ideal: 30 },
      },
    },
    (decoded: string) => opts.onDecode(decoded),
    () => {
      // per-frame "no QR in view" — expected, ignore
    }
  );

  return async () => {
    try {
      await scanner.stop();
    } catch {}
    try {
      scanner.clear();
    } catch {}
  };
}
