// Weekly schedule on the member page, with a "next class" countdown.
// dow: 0=Monday..6=Sunday, times are gym-local (Europe/Athens).

type Row = { id: string; dow: number; start_time: string; title: string };

const DAYS_EL = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function athensNow(): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const map: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  let h = Number(get("hour"));
  if (h === 24) h = 0;
  return { dow: map[get("weekday")] ?? 0, minutes: h * 60 + Number(get("minute")) };
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function ScheduleCard({ rows, lang }: { rows: Row[]; lang: "el" | "en" }) {
  if (rows.length === 0) return null;
  const DAYS = lang === "el" ? DAYS_EL : DAYS_EN;
  const now = athensNow();

  // Next upcoming class within the next 7 days.
  let next: { row: Row; inMin: number } | null = null;
  for (const r of rows) {
    let delta = (r.dow - now.dow) * 1440 + (toMin(r.start_time) - now.minutes);
    if (delta < 0) delta += 7 * 1440;
    if (!next || delta < next.inMin) next = { row: r, inMin: delta };
  }

  const fmtIn = (min: number) => {
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (lang === "el") {
      if (d > 0) return `σε ${d}μ ${h}ω`;
      if (h > 0) return `σε ${h}ω ${m}λ`;
      return `σε ${m}λ`;
    }
    if (d > 0) return `in ${d}d ${h}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  };

  const byDay = DAYS.map((label, i) => ({
    label,
    i,
    classes: rows.filter((r) => r.dow === i),
  })).filter((d) => d.classes.length > 0);

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title font-display text-xl tracking-wide">
          {lang === "el" ? "Πρόγραμμα" : "Schedule"}
        </h2>
        {next && (
          <span className="text-[11px] text-brand font-semibold">
            {lang === "el" ? "επόμενο" : "next"}: {DAYS[next.row.dow]}{" "}
            {next.row.start_time} · {fmtIn(next.inMin)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {byDay.map((d) => (
          <div
            key={d.i}
            className={`rounded-lg px-3 py-2 ${
              d.i === now.dow
                ? "bg-brand/10 border border-brand/30"
                : "bg-neutral-900/50"
            }`}
          >
            <div className="flex gap-3">
              <span
                className={`font-display text-lg w-10 shrink-0 ${
                  d.i === now.dow ? "text-brand" : "text-neutral-400"
                }`}
              >
                {d.label}
              </span>
              <div className="flex-1 flex flex-col gap-0.5">
                {d.classes.map((c) => (
                  <div key={c.id} className="flex gap-2 text-sm">
                    <span className="tabular-nums text-neutral-300 shrink-0">
                      {c.start_time}
                    </span>
                    <span className="text-neutral-400 truncate">{c.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
