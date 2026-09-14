// Shared camera-QR plumbing for the scan page and the reception kiosk.
//
// Two things made the camera feel slow before:
//   1. html5-qrcode (~200KB) was only imported on the button press, so the
//      first tap paid a network round-trip before any video appeared.
//   2. The decode ran in pure JS at 10 fps over a fixed 250px box.
// So we preload the module as soon as the screen mounts, and hand the decode
// to the browser's native BarcodeDetector wherever it exists (Chrome/Android,
// Safari 17+) — an order of magnitude faster than the JS fallback.

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
    // Native decoding when the browser has it — this is the big win on the
    // cheap reception phone, where the JS decoder struggles to hit 10 fps.
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    verbose: false,
  });

  await scanner.start(
    { facingMode: opts.facing },
    {
      fps: 24,
      // Scale the target box with the viewfinder instead of a fixed 250px, so
      // the bigger square actually gives members a bigger place to aim at.
      qrbox: (w: number, h: number) => {
        const side = Math.floor(Math.min(w, h) * 0.8);
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
