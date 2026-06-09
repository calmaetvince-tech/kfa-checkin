import { requireOwner } from "@/lib/auth";
import { Scanner } from "./Scanner";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireOwner();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Scan check-in</h1>
      <p className="text-sm text-neutral-500">
        Point the camera at the member&apos;s QR. The check-in is logged
        automatically.
      </p>
      <Scanner />
    </div>
  );
}
