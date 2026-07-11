import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { Scanner } from "./Scanner";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireOwner();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="section-title font-display text-2xl tracking-wide">
        Scan check-in
      </h1>
      <p className="text-sm text-neutral-500">
        Point the camera at the member&apos;s QR. The check-in is logged
        automatically.
      </p>
      <Scanner />

      <Link
        href="/dashboard/camera-kiosk"
        className="card flex items-center justify-between gap-3 hover:border-brand"
      >
        <div>
          <p className="font-medium">📷 Camera kiosk (self-service)</p>
          <p className="text-xs text-neutral-500">
            Leave a spare phone/tablet at reception. Members hold their QR to the
            camera and check themselves in. No hardware, screen stays awake.
          </p>
        </div>
        <span className="text-brand text-xl shrink-0">→</span>
      </Link>

      <Link
        href="/dashboard/scan-kiosk"
        className="card flex items-center justify-between gap-3 hover:border-brand"
      >
        <div>
          <p className="font-medium">🔫 Scanner kiosk (hardware)</p>
          <p className="text-xs text-neutral-500">
            For a device with a USB/Bluetooth QR scanner gun. Fastest option for
            the pre-class rush.
          </p>
        </div>
        <span className="text-brand text-xl shrink-0">→</span>
      </Link>
    </div>
  );
}
