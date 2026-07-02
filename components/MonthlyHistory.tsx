// Workouts-per-month memory. `counts` maps "YYYY-MM" (Athens month) → visits.
// Renders the last N months as labelled bars, oldest → newest, filling gaps
// with 0 so the history reads continuously.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthlyHistory({
  counts,
  months = 6,
  title = "Workouts per month",
}: {
  counts: Record<string, number>;
  months?: number;
  title?: string;
}) {
  // current Athens year/month
  const [cy, cm] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);

  const baseIdx = cy * 12 + (cm - 1); // months since year 0
  const rows = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = baseIdx - i;
    const yy = Math.floor(idx / 12);
    const mm = ((idx % 12) + 12) % 12; // 0-11
    const key = `${yy}-${String(mm + 1).padStart(2, "0")}`;
    rows.push({
      key,
      label: MONTHS[mm],
      year: yy,
      count: counts[key] ?? 0,
      isCurrent: i === 0,
    });
  }
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <section className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="section-title font-display text-xl tracking-wide">{title}</h2>
        <span className="text-xs text-neutral-500">{total} in {months} mo</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-9 text-xs text-neutral-500 shrink-0">
              {r.label}
            </span>
            <div className="flex-1 h-6 rounded bg-neutral-800/70 overflow-hidden">
              <div
                className={`h-full rounded ${
                  r.isCurrent ? "bg-brand" : "bg-brand/55"
                }`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm font-semibold shrink-0">
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
