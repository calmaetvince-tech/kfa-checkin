import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { statusLabel, fmtDate, fmtTime, startOfGymTodayISO } from "@/lib/format";
import { WhatsAppReminderButton } from "@/components/WhatsAppReminderButton";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { rankFor } from "@/lib/rank";

export const dynamic = "force-dynamic";

type MemberStat = {
  member_id: string;
  name: string;
  phone: string | null;
  plan: string | null;
  subscription_renewed_at: string | null;
  subscription_expires_at: string | null;
  visits_this_month: number;
  total_visits: number;
  last_visit_at: string | null;
  current_streak: number;
  photo_updated_at: string | null;
};

type MemberJoin = { name: string; photo_updated_at: string | null };

type TodayCheckIn = {
  id: string;
  checked_in_at: string;
  member_id: string;
  members: MemberJoin | MemberJoin[] | null;
};

type BirthdayRow = {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
  photo_updated_at: string | null;
};

type WeekCheckIn = { checked_in_at: string };

function memberJoin(m: TodayCheckIn["members"]): MemberJoin {
  const fallback: MemberJoin = { name: "Member", photo_updated_at: null };
  if (!m) return fallback;
  return Array.isArray(m) ? m[0] ?? fallback : m;
}

// Bucket a check-in into a part of the day, in Europe/Athens local time.
const PART_DEFS = [
  { key: "morning", label: "Morning", emoji: "🌅", lo: 6, hi: 12 },
  { key: "afternoon", label: "Afternoon", emoji: "☀️", lo: 12, hi: 17 },
  { key: "evening", label: "Evening", emoji: "🌆", lo: 17, hi: 22 },
  { key: "late", label: "Late", emoji: "🌙", lo: 22, hi: 30 }, // 22:00–05:59
] as const;

function athensHour(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  let h = Number(parts.find((p) => p.type === "hour")?.value);
  if (h === 24) h = 0;
  return h;
}

function athensYMD(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function partKey(hour: number): string {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
}

function summarizeByPart(items: { checked_in_at: string }[]) {
  const counts: Record<string, number> = {};
  for (const it of items) {
    const k = partKey(athensHour(it.checked_in_at));
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return PART_DEFS.map((d) => ({ ...d, count: counts[d.key] ?? 0 }));
}

export default async function DashboardPage() {
  const { supabase } = await requireOwner();

  const startOfToday = startOfGymTodayISO();
  const startOfWeekWindow = new Date(
    Date.parse(startOfToday) - 6 * 86_400_000
  ).toISOString();

  const [
    { data: members, error },
    { data: todayRaw },
    { data: birthdayRaw },
    { data: weekRaw },
  ] = await Promise.all([
    supabase.rpc("get_members_overview"),
    supabase
      .from("check_ins")
      .select("id, checked_in_at, member_id, members(name, photo_updated_at)")
      .gte("checked_in_at", startOfToday)
      .order("checked_in_at", { ascending: false })
      .limit(100)
      .returns<TodayCheckIn[]>(),
    supabase
      .from("members")
      .select("id, name, phone, date_of_birth, photo_updated_at")
      .not("date_of_birth", "is", null)
      .returns<BirthdayRow[]>(),
    supabase
      .from("check_ins")
      .select("checked_in_at")
      .gte("checked_in_at", startOfWeekWindow)
      .limit(2000)
      .returns<WeekCheckIn[]>(),
  ]);

  if (error) {
    return (
      <div className="card text-rose-600">
        Failed to load members: {error.message}
      </div>
    );
  }

  const list = (members ?? []) as MemberStat[];
  const today = todayRaw ?? [];

  const now = Date.now();
  const in3Days = now + 3 * 86_400_000;
  const in7Days = now + 7 * 86_400_000;

  const activeCount = list.filter(
    (m) =>
      m.subscription_expires_at &&
      new Date(m.subscription_expires_at).getTime() > now
  ).length;

  // The owner's money list: subs expiring within 7 days, soonest first.
  const nearExpiry = list
    .filter((m) => {
      if (!m.subscription_expires_at) return false;
      const t = new Date(m.subscription_expires_at).getTime();
      return t > now && t <= in7Days;
    })
    .sort(
      (a, b) =>
        new Date(a.subscription_expires_at!).getTime() -
        new Date(b.subscription_expires_at!).getTime()
    );

  const urgentRenewals = nearExpiry.filter(
    (m) => new Date(m.subscription_expires_at!).getTime() <= in3Days
  );
  const weekRenewals = nearExpiry.filter(
    (m) => new Date(m.subscription_expires_at!).getTime() > in3Days
  );

  // Expired — most recently expired first (freshest chance to win them back).
  const expired = list
    .filter(
      (m) =>
        m.subscription_expires_at &&
        new Date(m.subscription_expires_at).getTime() <= now
    )
    .sort(
      (a, b) =>
        new Date(b.subscription_expires_at!).getTime() -
        new Date(a.subscription_expires_at!).getTime()
    );

  // Coming up later this month (8–30 days out).
  const in30Days = now + 30 * 86_400_000;
  const monthRenewals = list
    .filter((m) => {
      if (!m.subscription_expires_at) return false;
      const t = new Date(m.subscription_expires_at).getTime();
      return t > in7Days && t <= in30Days;
    })
    .sort(
      (a, b) =>
        new Date(a.subscription_expires_at!).getTime() -
        new Date(b.subscription_expires_at!).getTime()
    );

  // Active members we haven't seen in 14+ days (or ever). Longest absence first.
  const fourteenDaysAgo = now - 14 * 86_400_000;
  const inactiveMembers = list
    .filter((m) => {
      const active =
        m.subscription_expires_at &&
        new Date(m.subscription_expires_at).getTime() > now;
      if (!active) return false;
      if (!m.last_visit_at) return true;
      return new Date(m.last_visit_at).getTime() < fourteenDaysAgo;
    })
    .map((m) => ({
      ...m,
      daysSince: m.last_visit_at
        ? Math.floor((now - new Date(m.last_visit_at).getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => {
      const av = a.daysSince === null ? Infinity : a.daysSince;
      const bv = b.daysSince === null ? Infinity : b.daysSince;
      return bv - av;
    });
  const INACTIVE_CAP = 10;

  // Today's birthdays — Athens month/day.
  const athensParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(new Date());
  const todayMonth = Number(athensParts.find((p) => p.type === "month")?.value);
  const todayDay = Number(athensParts.find((p) => p.type === "day")?.value);
  const todaysBirthdays = (birthdayRaw ?? []).filter((m) => {
    if (!m.date_of_birth) return false;
    const [, mm, dd] = m.date_of_birth.split("-").map(Number);
    return mm === todayMonth && dd === todayDay;
  });

  // Greeting + date line (Athens).
  const athensHourParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  let hourNow = Number(athensHourParts.find((p) => p.type === "hour")?.value);
  if (hourNow === 24) hourNow = 0;
  const greeting =
    hourNow < 12 ? "Καλημέρα" : hourNow < 20 ? "Καλησπέρα" : "Καληνύχτα";
  const dateLine = new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const chips = [
    {
      n: today.length,
      href: "#today",
      label: `${today.length} check-ins`,
      cls: "bg-brand/15 text-brand border-brand/30",
    },
    {
      n: todaysBirthdays.length,
      href: "#birthdays",
      label: `🎂 ${todaysBirthdays.length} γενέθλια`,
      cls: "bg-brand/15 text-brand border-brand/30",
    },
    {
      n: urgentRenewals.length,
      href: "#renewals",
      label: `🚨 ${urgentRenewals.length} ανανεώσεις`,
      cls: "bg-rose-950/50 text-rose-300 border-rose-800/60",
    },
    {
      n: inactiveMembers.length,
      href: "#inactive",
      label: `🕊️ ${inactiveMembers.length} χαμένα μέλη`,
      cls: "bg-neutral-800/60 text-neutral-300 border-neutral-700",
    },
  ].filter((c) => c.n > 0);

  // 7-day pulse — check-ins per Athens day, oldest → today.
  const pulse: { label: string; ymd: string; count: number; isToday: boolean }[] =
    [];
  for (let i = 6; i >= 0; i--) {
    const iso = new Date(Date.parse(startOfToday) - i * 86_400_000 + 60_000);
    const ymd = athensYMD(iso.toISOString());
    const label = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Athens",
      weekday: "short",
    }).format(iso);
    pulse.push({ label, ymd, count: 0, isToday: i === 0 });
  }
  for (const c of weekRaw ?? []) {
    const ymd = athensYMD(c.checked_in_at);
    const slot = pulse.find((p) => p.ymd === ymd);
    if (slot) slot.count++;
  }
  const pulseMax = Math.max(1, ...pulse.map((p) => p.count));
  const pulseTotal = pulse.reduce((s, p) => s + p.count, 0);

  // Month totals + leaderboard from the overview data (no extra queries).
  const monthTotal = list.reduce((s, m) => s + m.visits_this_month, 0);
  const bestStreak = Math.max(0, ...list.map((m) => m.current_streak));
  const topFighters = [...list]
    .filter((m) => m.visits_this_month > 0)
    .sort((a, b) => b.visits_this_month - a.visits_this_month)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* HERO ------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/15 via-neutral-900 to-neutral-950 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-4 opacity-[0.13] rotate-6"
        >
          <Logo size="lg" />
        </div>
        <p className="text-xs uppercase tracking-widest text-brand/80">
          {dateLine}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">
          {greeting}, Δάσκαλε. 🥊
        </h1>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${c.cls} active:scale-95 transition`}
              >
                {c.label}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-400">
            Όλα ήσυχα σήμερα — έτοιμος για την επόμενη προπόνηση 👊
          </p>
        )}
      </section>

      {/* BIRTHDAYS -------------------------------------------------------- */}
      {todaysBirthdays.length > 0 && (
        <section
          id="birthdays"
          className="card flex flex-col gap-2 border-brand/40"
        >
          <h2 className="section-title font-display text-xl tracking-wide">🎂 Birthday today</h2>
          <ul className="flex flex-col gap-1">
            {todaysBirthdays.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/member/${m.id}`}
                  className="flex items-center gap-2.5 min-w-0 hover:text-brand"
                >
                  <Avatar
                    name={m.name}
                    memberId={m.id}
                    photoVersion={m.photo_updated_at}
                  />
                  <span className="font-medium truncate">{m.name}</span>
                </Link>
                <WhatsAppReminderButton
                  name={m.name}
                  phone={m.phone}
                  variant="birthday"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* STATS ------------------------------------------------------------ */}
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Members" value={list.length} icon="👥" />
        <Stat label="Active subs" value={activeCount} icon="✅" tone="ok" />
        <Stat label="Today" value={today.length} icon="⚡" tone="brand" />
        <Stat label="This month" value={monthTotal} icon="📅" tone="brand" />
        <Stat label="This week" value={pulseTotal} icon="📈" />
        <Stat label="Best streak" value={bestStreak} icon="🔥" tone={bestStreak >= 3 ? "fire" : undefined} />
      </section>

      {/* TOP FIGHTERS ------------------------------------------------------ */}
      {topFighters.length > 0 && (
        <section className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-display text-xl tracking-wide">🏆 Top fighters · this month</h2>
            <span className="text-xs text-neutral-500">by visits</span>
          </div>
          <ul className="flex flex-col">
            {topFighters.map((m, i) => (
              <li key={m.member_id}>
                <Link
                  href={`/dashboard/member/${m.member_id}`}
                  className="flex items-center gap-3 py-2 hover:text-brand"
                >
                  <span className="w-7 text-center text-lg shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                      <span className="text-xs text-neutral-500">{i + 1}</span>
                    )}
                  </span>
                  <Avatar
                    name={m.name}
                    memberId={m.member_id}
                    photoVersion={m.photo_updated_at}
                  />
                  <span className="flex-1 font-medium truncate">{m.name}</span>
                  {m.current_streak >= 3 && (
                    <span className="text-xs text-orange-400 font-semibold shrink-0">
                      🔥{m.current_streak}
                    </span>
                  )}
                  <span className="shrink-0 rounded-full bg-brand/15 border border-brand/30 px-2.5 py-1 text-xs font-bold text-brand tabular-nums">
                    {m.visits_this_month}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* WEEK PULSE -------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title font-display text-xl tracking-wide">Gym pulse · 7 days</h2>
          <span className="text-xs text-neutral-500">
            {pulseTotal} check-in{pulseTotal === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-24">
          {pulse.map((p) => (
            <div
              key={p.ymd}
              className="flex h-full flex-col items-center justify-end gap-1"
            >
              <span
                className={`text-[11px] font-semibold ${
                  p.count > 0 ? "text-neutral-300" : "text-neutral-700"
                }`}
              >
                {p.count}
              </span>
              <div
                title={`${p.ymd}: ${p.count}`}
                className={`w-full rounded-md transition ${
                  p.isToday
                    ? "bg-brand shadow-[0_0_14px_rgba(212,160,23,0.35)]"
                    : p.count > 0
                    ? "bg-brand/45"
                    : "bg-neutral-800"
                }`}
                style={{
                  height: `${Math.max(8, (p.count / pulseMax) * 72)}px`,
                }}
              />
              <span
                className={`text-[10px] ${
                  p.isToday ? "text-brand font-bold" : "text-neutral-600"
                }`}
              >
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* TODAY'S CHECK-INS FEED -------------------------------------------- */}
      <section id="today" className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title font-display text-xl tracking-wide">Today&apos;s check-ins</h2>
          <span className="text-xs text-neutral-500">{today.length}</span>
        </div>

        {today.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {summarizeByPart(today).map((p) => (
              <div
                key={p.key}
                className={`rounded-lg p-2 text-center ${
                  p.count > 0
                    ? "bg-brand/15 border border-brand/30"
                    : "bg-neutral-800/40"
                }`}
              >
                <div className="text-base leading-none">{p.emoji}</div>
                <div
                  className={`text-lg font-bold leading-tight ${
                    p.count > 0 ? "text-brand" : "text-neutral-600"
                  }`}
                >
                  {p.count}
                </div>
                <div className="text-[10px] text-neutral-500">{p.label}</div>
              </div>
            ))}
          </div>
        )}

        {today.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nobody in yet today. Hit{" "}
            <Link href="/dashboard/scan" className="text-brand underline">
              Scan
            </Link>{" "}
            when the next class rolls in.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800/80">
            {today.map((c) => {
              const mj = memberJoin(c.members);
              return (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <Avatar
                  name={mj.name}
                  memberId={c.member_id}
                  photoVersion={mj.photo_updated_at}
                />
                <Link
                  href={`/dashboard/member/${c.member_id}`}
                  className="flex-1 font-medium truncate hover:text-brand"
                >
                  {mj.name}
                </Link>
                <span className="text-xs tabular-nums text-neutral-500 shrink-0">
                  {fmtTime(c.checked_in_at)}
                </span>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* SUBSCRIPTIONS BOARD ------------------------------------------------ */}
      {(expired.length > 0 ||
        nearExpiry.length > 0 ||
        monthRenewals.length > 0) && (
        <section id="renewals" className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-display text-xl tracking-wide">💳 Subscriptions ending</h2>
            <span className="text-xs text-neutral-500">
              {expired.length + nearExpiry.length + monthRenewals.length}
            </span>
          </div>

          {urgentRenewals.length > 0 && (
            <div className="rounded-xl border-2 border-rose-700/70 bg-rose-950/30 p-3 flex flex-col gap-1">
              <h3 className="font-bold text-rose-300 text-sm">
                🚨 Επείγον — λήγουν σε ≤3 μέρες
              </h3>
              <ul className="divide-y divide-neutral-800/80">
                {urgentRenewals.map((m) => (
                  <SubRow key={m.member_id} m={m} zone="urgent" />
                ))}
              </ul>
            </div>
          )}

          {weekRenewals.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-amber-300 text-sm">
                ⏳ Αυτή την εβδομάδα (4–7 μέρες)
              </h3>
              <ul className="divide-y divide-neutral-800/80">
                {weekRenewals.map((m) => (
                  <SubRow key={m.member_id} m={m} zone="week" />
                ))}
              </ul>
            </div>
          )}

          {monthRenewals.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-neutral-300 text-sm">
                📅 Μέσα στον μήνα (8–30 μέρες)
              </h3>
              <ul className="divide-y divide-neutral-800/80">
                {monthRenewals.map((m) => (
                  <SubRow key={m.member_id} m={m} zone="month" />
                ))}
              </ul>
            </div>
          )}

          {expired.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-rose-400 text-sm">
                ❌ Έχουν λήξει
              </h3>
              <ul className="divide-y divide-neutral-800/80">
                {expired.map((m) => (
                  <SubRow key={m.member_id} m={m} zone="expired" />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* INACTIVE MEMBERS --------------------------------------------------- */}
      {inactiveMembers.length > 0 && (
        <section id="inactive" className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-display text-xl tracking-wide">🕊️ Haven&apos;t seen in a while</h2>
            <span className="text-xs text-neutral-500">
              {inactiveMembers.length}
            </span>
          </div>
          <ul className="divide-y divide-neutral-800/80">
            {inactiveMembers.slice(0, INACTIVE_CAP).map((m) => (
              <li key={m.member_id} className="flex items-center gap-3 py-2">
                <Avatar
                  name={m.name}
                  memberId={m.member_id}
                  photoVersion={m.photo_updated_at}
                  dim
                />
                <Link
                  href={`/dashboard/member/${m.member_id}`}
                  className="flex-1 font-medium truncate hover:text-brand min-w-0"
                >
                  {m.name}
                </Link>
                <span className="text-xs text-neutral-500 shrink-0">
                  {m.daysSince === null ? "never" : `${m.daysSince}d`}
                </span>
                <WhatsAppReminderButton
                  name={m.name}
                  phone={m.phone}
                  variant="inactive"
                />
              </li>
            ))}
          </ul>
          {inactiveMembers.length > INACTIVE_CAP && (
            <Link
              href="#members"
              className="text-xs text-brand underline self-start"
            >
              View all {inactiveMembers.length} →
            </Link>
          )}
        </section>
      )}

      {/* ALL MEMBERS -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <h2 id="members" className="section-title font-display text-2xl tracking-wide">
          Members
        </h2>
        <span className="text-xs text-neutral-500">{list.length}</span>
      </div>

      {list.length === 0 && (
        <div className="card text-sm text-neutral-500">
          No members yet.{" "}
          <Link href="/dashboard/add" className="text-brand underline">
            Add the first one
          </Link>
          .
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {list.map((m) => (
          <MemberRow key={m.member_id} m={m} />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({ m }: { m: MemberStat }) {
  const s = statusLabel(m.subscription_expires_at);
  return (
    <li>
      <Link
        href={`/dashboard/member/${m.member_id}`}
        className="card flex items-center gap-3 hover:border-brand active:scale-[0.99] transition"
      >
        <Avatar
          name={m.name}
          memberId={m.member_id}
          photoVersion={m.photo_updated_at}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{m.name}</p>
            <span
              className="shrink-0 text-sm"
              title={rankFor(m.total_visits).rank.en}
            >
              {rankFor(m.total_visits).rank.icon}
            </span>
            {m.current_streak >= 3 && (
              <span className="shrink-0 text-xs text-orange-400 font-semibold">
                🔥{m.current_streak}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 truncate">
            {m.plan ?? "No plan"} · exp {fmtDate(m.subscription_expires_at)} ·{" "}
            {m.visits_this_month} this mo · {m.total_visits} total
          </p>
        </div>
        <span className={`badge-${s.tone} shrink-0`}>{s.label}</span>
      </Link>
    </li>
  );
}

function SubRow({
  m,
  zone,
}: {
  m: MemberStat;
  zone: "urgent" | "week" | "month" | "expired";
}) {
  const now = Date.now();
  const exp = new Date(m.subscription_expires_at!).getTime();
  const days = Math.abs(
    zone === "expired"
      ? Math.floor((now - exp) / 86_400_000)
      : Math.ceil((exp - now) / 86_400_000)
  );
  const badge =
    zone === "expired"
      ? { cls: "badge-bad", text: `πριν ${days}μ` }
      : zone === "urgent"
      ? { cls: "badge-bad", text: `σε ${days}μ` }
      : zone === "week"
      ? { cls: "badge-warn", text: `σε ${days}μ` }
      : { cls: "badge-ok", text: `σε ${days}μ` };

  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar
        name={m.name}
        memberId={m.member_id}
        photoVersion={m.photo_updated_at}
        dim={zone === "expired"}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/member/${m.member_id}`}
          className="font-medium truncate hover:text-brand block"
        >
          {m.name}
        </Link>
        <p className="text-[11px] text-neutral-500 truncate">
          {m.plan ?? "No plan"} · ανανέωση{" "}
          {fmtDate(m.subscription_renewed_at)} · λήξη{" "}
          {fmtDate(m.subscription_expires_at)} · {m.visits_this_month} επισκ.
          μήνα
        </p>
      </div>
      <span className={`${badge.cls} shrink-0`}>{badge.text}</span>
      <WhatsAppReminderButton
        name={m.name}
        phone={m.phone}
        expiresAt={m.subscription_expires_at!}
      />
    </li>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone?: "ok" | "brand" | "fire";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-400"
      : tone === "brand"
      ? "text-brand"
      : tone === "fire"
      ? "text-orange-400"
      : "text-neutral-100";
  return (
    <div className="card flex flex-col items-center gap-0.5 py-3">
      <span aria-hidden className="text-sm">{icon}</span>
      <p className={`font-display text-4xl tabular-nums leading-none ${color}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}
