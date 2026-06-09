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

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}
