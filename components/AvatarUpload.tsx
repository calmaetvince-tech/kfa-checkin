"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { initials } from "./Avatar";

// Member-side avatar with upload: tap the photo (or the 📷 badge) to pick an
// image; it's downscaled to 256px JPEG client-side and saved via the
// token-authorized set_member_photo RPC.
export function AvatarUpload({
  token,
  name,
  photo,
}: {
  token: string;
  name: string;
  photo: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(photo);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await downscale(file, 256, 0.78);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("set_member_photo", {
        p_token: token,
        p_photo: dataUrl,
      });
      if (error || data !== true) throw new Error(error?.message ?? "failed");
      setPreview(dataUrl);
      router.refresh();
    } catch {
      setErr("Δεν ανέβηκε — δοκίμασε άλλη φωτογραφία.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Upload profile photo"
        className="relative active:scale-95 transition disabled:opacity-60"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-brand/50"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/15 text-brand text-2xl font-bold ring-2 ring-brand/30">
            {initials(name)}
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm ring-2 ring-neutral-950">
          {busy ? "…" : "📷"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  );
}

function downscale(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
