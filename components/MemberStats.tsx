// Rich attendance stats for the owner's member-detail view.
// Pure server component: give it every check-in timestamp, it computes and
// renders. All day/hour bucketing is done in Europe/Athens local time.

const TZ = "Europe/Athens";
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_IDX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function athensParts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = f.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return { hour, dow: DOW_IDX[get("weekday")] ?? 0, ymd };
}

const dayIdx = (ymd: string) =>
  Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);

function partOfDay(hour: number): string {
  if (hour < 6) return "Late night";
  if (hour < 12) return "Mornings";
  if (hour < 17) return "Afternoons";
  if (hour < 21) return "Evenings";
  return "Nights";
}

export function MemberStats({ checkIns }: { checkIns: string[] }) {
  if (checkIns.length === 0) {
    return (
      <section className="card">
        <h2 className="font-semibold mb-1">Attendance</h2>
        <p className="text-sm text-neutral-500">
          No visits yet — stats appear after the first check-in.
        </p>
      </section>
    );
  }

  const byHour = new Array(24).fill(0);
  const byDow = new Array(7).fill(0);
  const dayset = new Set<number>();
  const parsed = checkIns.map((iso) => {
    const p = athensParts(iso);
    byHour[p.hour]++;
    byDow[p.dow]++;
    const di = dayIdx(p.ymd);
    dayset.add(di);
    return { ...p, di };
  });

  const today = athensParts(new Date().toISOString());
  const todayIdx = dayIdx(today.ymd);

  const total = checkIns.length;
  const thisWeek = parsed.filter((p) => p.di >= todayIdx - 6).length;
  const thisMonth = parsed.filter(
    (p) => p.ymd.slice(0, 7) === today.ymd.slice(0, 7)
  ).length;

  // streaks from distinct days
  const days = [...dayset].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  // current streak: walk back from today/yesterday
  let current = 0;
  let cursor = dayset.has(todayIdx)
    ? todayIdx
    : dayset.has(todayIdx - 1)
    ? todayIdx - 1
    : null;
  while (cursor !== null && dayset.has(cursor)) {
    current++;
    cursor--;
  }

  // weekly trend, last 8 weeks (oldest → newest)
  const weeks = new Array(8).fill(0);
  for (const p of parsed) {
    const w = Math.floor((todayIdx - p.di) / 7);
    if (w >= 0 && w < 8) weeks[7 - w]++;
  }

  const firstIdx = days[0];
  const weeksSince = Math.max(1, Math.ceil((todayIdx - firstIdx + 1) / 7));
  const perWeek = (total / weeksSince).toFixed(1);

  const peakHour = byHour.indexOf(Math.max(...byHour));
  const peakDow = byDow.indexOf(Math.max(...byDow));
  const maxHour = Math.max(...byHour, 1);
  const maxDow = Math.max(...byDow, 1);
  const maxWeek = Math.max(...weeks, 1);

  return (
    <section className="card flex flex-col gap-4">
      <h2 className="section-title font-display text-xl tracking-wide">Attendance</h2>

      {/* headline tiles */}
      <div className="grid grid-cols-4 gap-2">
        <Tile value={total} label="Total" />
        <Tile value={thisWeek} label="This wk" tone="brand" />
        <Tile value={thisMonth} label="This mo" />
        <Tile value={current} label="Streak" tone={current >= 3 ? "fire" : undefined} />
      </div>

      <p className="text-xs text-neutral-400">
        ≈ <span className="text-neutral-200 font-medium">{perWeek}</span>{" "}
        visits/week · usually trains{" "}
        <span className="text-neutral-200 font-medium">
          {partOfDay(peakHour).toLowerCase()}
        </span>{" "}
        on{" "}
        <span className="text-neutral-200 font-medium">{DOW[peakDow]}</span> ·
        best streak {longest}
      </p>

      {/* time of day */}
      <div>
        <p className="text-xs text-neutral-500 mb-1">Time of day</p>
        <div className="flex items-end gap-[2px] h-16">
          {byHour.map((c, h) => (
            <div
              key={h}
              title={`${h}:00 — ${c}`}
              className={`flex-1 rounded-sm ${
                h === peakHour ? "bg-brand" : "bg-neutral-700"
              }`}
              style={{ height: `${Math.max(4, (c / maxHour) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
          <span>0:00</span>
          <span>6:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* day of week */}
      <div>
        <p className="text-xs text-neutral-500 mb-1">Day of week</p>
        <div className="grid grid-cols-7 gap-1 items-end h-16">
          {byDow.map((c, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full gap-1">
              <div
                title={`${DOW[i]} — ${c}`}
                className={`w-full rounded-sm ${
                  i === peakDow ? "bg-brand" : "bg-neutral-700"
                }`}
                style={{ height: `${Math.max(6, (c / maxDow) * 100)}%` }}
              />
              <span className="text-[10px] text-neutral-600">{DOW[i][0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* weekly trend */}
      <div>
        <p className="text-xs text-neutral-500 mb-1">Last 8 weeks</p>
        <div className="grid grid-cols-8 gap-1 items-end h-14">
          {weeks.map((c, i) => (
            <div
              key={i}
              title={`${c} visits`}
              className="rounded-sm bg-gradient-to-t from-brand/40 to-brand"
              style={{ height: `${Math.max(6, (c / maxWeek) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
          <span>8 wks ago</span>
          <span>now</span>
        </div>
      </div>
    </section>
  );
}

function Tile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "brand" | "fire";
}) {
  const color =
    tone === "fire"
      ? "text-orange-400"
      : tone === "brand"
      ? "text-brand"
      : "text-neutral-100";
  return (
    <div className="bg-neutral-800/60 rounded-lg p-2 text-center">
      <p className={`text-xl font-bold ${color}`}>
        {tone === "fire" && value >= 3 ? "🔥" : ""}
        {value}
      </p>
      <p className="text-[10px] text-neutral-500">{label}</p>
    </div>
  );
}
