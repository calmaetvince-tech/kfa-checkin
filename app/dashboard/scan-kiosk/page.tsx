import { requireOwner } from "@/lib/auth";
import { KioskScanner } from "./KioskScanner";

export const dynamic = "force-dynamic";

// Fullscreen, no-touch check-in station for a door-mounted device with a
// hardware USB/Bluetooth QR scanner. Nothing on screen is clickable — the
// scanner "types" the QR into an always-focused hidden input. Leave this
// page open on a dedicated laptop/mini-PC/tablet at the door; members scan
// themselves in without the owner touching anything.
export default async function ScanKioskPage() {
  await requireOwner();
  return <KioskScanner />;
}
