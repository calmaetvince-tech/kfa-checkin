// Shared member avatar: real photo when they've uploaded one, gold initials
// otherwise. Server-component safe (plain <img> against the cached avatar
// route, version-busted by photo_updated_at).

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  memberId,
  photoVersion,
  dim = false,
  size = "sm",
}: {
  name: string;
  memberId?: string;
  photoVersion?: string | null;
  dim?: boolean;
  size?: "sm" | "lg";
}) {
  const cls = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";

  if (memberId && photoVersion) {
    const v = Date.parse(photoVersion);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${memberId}?v=${v}`}
        alt=""
        className={`${cls} shrink-0 rounded-full object-cover ring-1 ${
          dim ? "ring-neutral-700/60 opacity-70" : "ring-brand/40"
        }`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex ${cls} shrink-0 items-center justify-center rounded-full font-bold ring-1 ${
        dim
          ? "bg-neutral-800/70 text-neutral-500 ring-neutral-700/60"
          : "bg-brand/15 text-brand ring-brand/30"
      }`}
    >
      {initials(name)}
    </span>
  );
}
