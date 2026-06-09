// Last-30-days training heatmap. Pure CSS grid, no client JS, no library.
// `activeDays` is a list of ISO date strings (YYYY-MM-DD) the member trained.

function toLocalISODate(d: Date): string {
  // local calendar date as YYYY-MM-DD (avoids UTC off-by-one)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Heatmap({ activeDays }: { activeDays: string[] }) {
  const active = new Set(activeDays);

  // Build the last 30 calendar days, oldest → newest.
  const today = new Date();
  const days: { iso: string; label: number; isActive: boolean; isToday: boolean }[] =
    [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toLocalISODate(d);
    days.push({
      iso,
      label: d.getDate(),
      isActive: active.has(iso),
      isToday: i === 0,
    });
  }

  const trainedCount = days.filter((d) => d.isActive).length;

  // Pad the front so the first column aligns to weekday (Mon-first).
  const firstDow = (new Date(days[0].iso).getDay() + 6) % 7; // 0 = Monday
  const pads = Array.from({ length: firstDow });

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Last 30 days</h2>
        <span className="text-xs text-neutral-500">
          {trainedCount} session{trainedCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="text-[10px] text-neutral-600 text-center leading-none"
          >
            {d}
          </div>
        ))}
        {pads.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => (
          <div
            key={d.iso}
            title={d.iso}
            className={[
              "aspect-square rounded-[5px] flex items-center justify-center text-[10px] transition",
              d.isActive
                ? "bg-brand text-brand-ink font-bold"
                : "bg-neutral-800/70 text-neutral-600",
              d.isToday ? "ring-2 ring-brand/60" : "",
            ].join(" ")}
          >
            {d.label}
          </div>
        ))}
      </div>
    </section>
  );
}
