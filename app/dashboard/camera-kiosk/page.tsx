import { requireOwner } from "@/lib/auth";
import { CameraKiosk } from "./CameraKiosk";

export const dynamic = "force-dynamic";

// Unattended camera check-in station for a fixed phone/tablet at reception.
// Members hold their QR to the camera and scan themselves in; the screen stays
// awake and loops automatically. Zero hardware — the free twin of scan-kiosk.
export default async function CameraKioskPage() {
  await requireOwner();
  return <CameraKiosk />;
}
