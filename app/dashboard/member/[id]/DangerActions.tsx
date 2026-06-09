"use client";

import { useState, useTransition } from "react";
import { rotateQrToken, deleteMember } from "./actions";

export function DangerActions({ memberId }: { memberId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<null | "rotate" | "delete">(
    null
  );

  function ask(action: "rotate" | "delete") {
    setConfirming(action);
  }

  function cancel() {
    setConfirming(null);
  }

  function confirm() {
    if (!confirming) return;
    const action = confirming;
    setConfirming(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", memberId);
      if (action === "rotate") {
        await rotateQrToken(fd);
      } else {
        await deleteMember(fd);
      }
    });
  }

  if (confirming === "rotate") {
    return (
      <ConfirmBox
        title="Rotate QR code?"
        body="The member's current QR will stop working immediately. Their /m/ link will also change — you'll need to send them the new one via WhatsApp."
        cta="Yes, rotate"
        tone="warn"
        onCancel={cancel}
        onConfirm={confirm}
        pending={pending}
      />
    );
  }

  if (confirming === "delete") {
    return (
      <ConfirmBox
        title="Delete member?"
        body="This removes the member and all their check-in history. Cannot be undone."
        cta="Yes, delete"
        tone="bad"
        onCancel={cancel}
        onConfirm={confirm}
        pending={pending}
      />
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={() => ask("rotate")}
        className="btn-ghost text-amber-300 border-amber-900"
      >
        🔄 Rotate QR
      </button>
      <button
        onClick={() => ask("delete")}
        className="btn-ghost text-rose-400 border-rose-900"
      >
        🗑 Delete member
      </button>
    </div>
  );
}

function ConfirmBox({
  title,
  body,
  cta,
  tone,
  onCancel,
  onConfirm,
  pending,
}: {
  title: string;
  body: string;
  cta: string;
  tone: "warn" | "bad";
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const border = tone === "warn" ? "border-amber-700" : "border-rose-700";
  const ctaCls =
    tone === "warn"
      ? "btn bg-amber-500 text-neutral-950 hover:bg-amber-400 font-semibold"
      : "btn bg-rose-600 text-white hover:bg-rose-500 font-semibold";
  return (
    <div className={`card ${border} flex flex-col gap-3`}>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-neutral-400">{body}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1" disabled={pending}>
          Cancel
        </button>
        <button onClick={onConfirm} className={`${ctaCls} flex-1`} disabled={pending}>
          {pending ? "Working…" : cta}
        </button>
      </div>
    </div>
  );
}
