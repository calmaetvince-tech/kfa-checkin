"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "kfa-member-token";

export function ForgetDeviceButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  function forget() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("kfa-install-dismissed");
    } catch {
      // ignore
    }
    router.replace("/?owner=1");
  }

  if (confirming) {
    return (
      <div className="card border-amber-700 flex flex-col gap-2 text-sm">
        <p>
          Clear this device&apos;s saved member? Next time you open the app
          you&apos;ll see the landing page instead of this QR.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={forget} className="btn-primary flex-1">
            Yes, clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-neutral-500 underline self-center"
    >
      Not you? Forget this device
    </button>
  );
}
