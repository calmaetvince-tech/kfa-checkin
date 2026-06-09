"use client";

import { useState } from "react";

export function ShareButtons({
  url,
  memberName,
  memberPhone,
}: {
  url: string;
  memberName: string;
  memberPhone: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const waText = encodeURIComponent(
    `Welcome to KFA, ${memberName}! 🥊\n\nHere's your personal check-in link — show this QR at the gym. Save it to your phone's home screen for one-tap access:\n\n${url}`
  );

  // Only use direct-to-contact if the phone clearly starts with a "+"
  // (international format). Otherwise, open the picker so the owner picks
  // the contact — avoids wa.me's "invalid number" errors.
  const trimmedPhone = (memberPhone ?? "").trim();
  const digitsOnly = trimmedPhone.replace(/[^\d]/g, "");
  const isInternational =
    trimmedPhone.startsWith("+") && digitsOnly.length >= 8;

  const waHrefDirect = isInternational
    ? `https://wa.me/${digitsOnly}?text=${waText}`
    : null;
  const waHrefPicker = `https://wa.me/?text=${waText}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareErr("Couldn't copy. Long-press the link above to copy manually.");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `KFA — ${memberName}`,
          text: `Your KFA check-in link`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {waHrefDirect && (
        <a
          href={waHrefDirect}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full"
        >
          💬 Send to {memberName.split(" ")[0]} on WhatsApp
        </a>
      )}
      <a
        href={waHrefPicker}
        target="_blank"
        rel="noopener noreferrer"
        className={waHrefDirect ? "btn-ghost w-full" : "btn-primary w-full"}
      >
        💬 {waHrefDirect ? "Or pick a different contact" : "Share via WhatsApp"}
      </a>
      <button onClick={copyLink} className="btn-ghost w-full">
        {copied ? "✓ Copied!" : "📋 Copy link"}
      </button>
      <button onClick={nativeShare} className="btn-ghost w-full">
        📤 More share options…
      </button>
      {shareErr && <p className="text-xs text-rose-400">{shareErr}</p>}
      {!isInternational && trimmedPhone && (
        <p className="text-xs text-neutral-500">
          ℹ️ Tip: phone <code>{trimmedPhone}</code> isn&apos;t in international
          format (e.g. <code>+30 69x xxx xxxx</code>). Edit the member to enable
          one-tap WhatsApp send.
        </p>
      )}
    </div>
  );
}
