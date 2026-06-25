// All gym times are shown in Rhodes / Greece local time.
export const GYM_TZ = "Europe/Athens";

export function isActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function statusLabel(expiresAt: string | null | undefined): {
  label: string;
  tone: "ok" | "warn" | "bad";
} {
  if (!expiresAt) return { label: "No subscription", tone: "bad" };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 0) return { label: "Expired", tone: "bad" };
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 7) return { label: `Expires in ${days}d`, tone: "warn" };
  return { label: `Active · ${days}d left`, tone: "ok" };
}

// e.g. "03 Jun 2026" — Rhodes time, unambiguous day-month-year.
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: GYM_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// e.g. "03 Jun 2026, 18:55" — Rhodes time, 24h.
export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    timeZone: GYM_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// e.g. "18:55" — Rhodes time, 24h.
export function fmtTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-GB", {
    timeZone: GYM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Start of "today" in Rhodes local time, returned as a UTC ISO string for
// querying. DST-safe: derives the real UTC instant of Athens local midnight.
export function startOfGymTodayISO(): string {
  const now = new Date();
  // Athens wall-clock parts right now
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GYM_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  // Athens wall time expressed as if it were UTC
  const wallAsUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second")
  );
  const offsetMs = wallAsUTC - now.getTime(); // Athens − UTC
  const midnightWallAsUTC = Date.UTC(get("year"), get("month") - 1, get("day"));
  return new Date(midnightWallAsUTC - offsetMs).toISOString();
}
