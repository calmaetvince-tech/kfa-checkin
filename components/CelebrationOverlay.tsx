"use client";

import { useEffect, useRef, useState } from "react";

// Full-screen 9:16 celebration video. Autoplays muted (mobile-friendly);
// the viewer can tap the top-right button to turn sound on. Closes when the
// clip ends or when they tap ✕.
export function CelebrationOverlay({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // ensure muted is a real DOM property so autoplay is allowed
    v.play().catch(() => {});
  }, []);

  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    v.play().catch(() => {});
  }

  const topInset = { top: "calc(env(safe-area-inset-top, 0px) + 12px)" };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onEnded={onClose}
        className="w-full h-full object-contain"
      />

      {/* close — top left */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ ...topInset, left: "12px" }}
        className="absolute z-10 h-10 w-10 rounded-full bg-black/55 text-white text-lg flex items-center justify-center backdrop-blur-sm active:scale-95"
      >
        ✕
      </button>

      {/* sound toggle — top right */}
      <button
        onClick={toggleSound}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        style={{ ...topInset, right: "12px" }}
        className="absolute z-10 flex items-center gap-1.5 rounded-full bg-black/55 text-white text-sm pl-2.5 pr-3 py-2 backdrop-blur-sm active:scale-95"
      >
        <span className="text-base">{muted ? "🔇" : "🔊"}</span>
        <span>{muted ? "Sound" : "On"}</span>
      </button>
    </div>
  );
}
