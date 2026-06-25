import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { statusLabel, fmtDate } from "@/lib/format";
import { WhatsAppReminderButton } from "@/components/WhatsAppReminderButton";

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
};

type TodayCheckIn = {
  id: string;
  checked_in_at: string;
  member_id: string;
  members: { name: string } | { name: string }[] | null;
};

type BirthdayRow = {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
};

function memberName(m: TodayCheckIn["members"]): string {
  if (!m) return "Member";
  return Array.isArray(m) ? m[0]?.name ?? "Member" : m.name;
}

export default async function DashboardPage() {
  const { supabase } = await requireOwner();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: members, error }, { data: todayRaw }, { data: birthdayRaw }] =
    await Promise.all([
      supabase.rpc("get_members_overview"),
      supabase
        .from("check_ins")
        .select("id, checked_in_at, member_id, members(name)")
        .gte("checked_in_at", startOfToday.toISOString())
        .order("checked_in_at", { ascending: false })
        .limit(100)
        .returns<TodayCheckIn[]>(),
      supabase
        .from("members")
        .select("id, name, phone, date_of_birth")
        .not("date_of_birth", "is", null)
        .returns<BirthdayRow[]>(),
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

  // Split: act-now (next 3 days) vs heads-up (days 4-7).
  const urgentRenewals = nearExpiry.filter(
    (m) => new Date(m.subscription_expires_at!).getTime() <= in3Days
  );
  const weekRenewals = nearExpiry.filter(
    (m) => new Date(m.subscription_expires_at!).getTime() > in3Days
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

  // Today's birthdays — compare DOB month/day against today in Europe/Athens.
  const athensParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(new Date());
  const todayMonth = Number(
    athensParts.find((p) => p.type === "month")?.value
  );
  const todayDay = Number(athensParts.find((p) => p.type === "day")?.value);
  const todaysBirthdays = (birthdayRaw ?? []).filter((m) => {
    if (!m.date_of_birth) return false;
    const [, mm, dd] = m.date_of_birth.split("-").map(Number);
    return mm === todayMonth && dd === todayDay;
  });

  // Daily situation summary (Greek). Greeting by Athens hour; zero segments are
  // dropped so the line stays calm and relevant.
  const athensHourParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  let athensHour = Number(
    athensHourParts.find((p) => p.type === "hour")?.value
  );
  if (athensHour === 24) athensHour = 0;
  const greeting =
    athensHour < 12
      ? "Καλημέρα"
      : athensHour < 20
      ? "Καλησπέρα"
      : "Καληνύχτα";

  const situation = [
    { n: today.length, href: "#today", label: `${today.length} check-ins` },
    {
      n: todaysBirthdays.length,
      href: "#birthdays",
      label: `${todaysBirthdays.length} γενέθλια`,
    },
    {
      n: urgentRenewals.length,
      href: "#renewals",
      label: `${urgentRenewals.length} επείγουσες ανανεώσεις`,
    },
    {
      n: inactiveMembers.length,
      href: "#inactive",
      label: `${inactiveMembers.length} χαμένα μέλη`,
    },
  ].filter((s) => s.n > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* DAILY SITUATION HEADER ----------------------------------------- */}
      <section className="card bg-gradient-to-br from-brand/10 to-transparent border-brand/30 text-sm">
        <span className="font-medium text-neutral-200">{greeting}!</span>{" "}
        {situation.length > 0 ? (
          <>
            <span className="text-neutral-400">Σήμερα: </span>
            {situation.map((s, i) => (
              <span key={s.href}>
                {i > 0 && <span className="text-neutral-600"> · </span>}
                <a href={s.href} className="text-brand hover:underline">
                  {s.label}
                </a>
              </span>
            ))}
          </>
        ) : (
          <span className="text-neutral-400">Όλα ήσυχα σήμερα 👌</span>
        )}
      </section>

      {/* BIRTHDAYS ------------------------------------------------------ */}
      {todaysBirthdays.length > 0 && (
        <section
          id="birthdays"
          className="card flex flex-col gap-2 border-brand/40 bg-gradient-to-br from-brand/10 to-transparent"
        >
          <h2 className="font-semibold">🎂 Birthday today</h2>
          <ul className="flex flex-col gap-1">
            {todaysBirthdays.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2"
              >
                <Link
                  href={`/dashboard/member/${m.id}`}
                  className="font-medium truncate hover:text-brand min-w-0"
                >
                  {m.name}
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

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Members" value={list.length} />
        <Stat label="Active subs" value={activeCount} tone="ok" />
        <Stat label="Today" value={today.length} tone="brand" />
      </section>

      {/* TODAY'S CHECK-INS FEED ----------------------------------------- */}
      <section id="today" className="card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today&apos;s check-ins</h2>
          <span className="text-xs text-neutral-500">{today.length}</span>
        </div>
        {today.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nobody in yet today. Open the{" "}
            <Link href="/dashboard/scan" className="text-brand underline">
              scan page
            </Link>{" "}
            for the next class.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {today.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2 gap-3"
              >
                <Link
                  href={`/dashboard/member/${c.member_id}`}
                  className="font-medium truncate hover:text-brand"
                >
                  {memberName(c.members)}
                </Link>
                <span className="text-xs text-neutral-500 shrink-0">
                  {new Date(c.checked_in_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* RENEWALS DUE --------------------------------------------------- */}
      {nearExpiry.length > 0 && (
        <section id="renewals" className="card flex flex-col gap-3">
          <h2 className="font-semibold">💰 Renewals due</h2>

          {urgentRenewals.length > 0 && (
            <div className="rounded-lg border-2 border-rose-700/70 bg-rose-950/30 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-rose-300">
                  🚨 Today&apos;s priority (≤3 days)
                </h3>
                <span className="text-xs text-neutral-500">
                  {urgentRenewals.length}
                </span>
              </div>
              <ul className="divide-y divide-neutral-800">
                {urgentRenewals.map((m) => (
                  <RenewalRow key={m.member_id} m={m} tone="bad" />
                ))}
              </ul>
            </div>
          )}

          {weekRenewals.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-amber-300">
                  Coming up this week
                </h3>
                <span className="text-xs text-neutral-500">
                  {weekRenewals.length}
                </span>
              </div>
              <ul className="divide-y divide-neutral-800">
                {weekRenewals.map((m) => (
                  <RenewalRow key={m.member_id} m={m} tone="warn" />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* INACTIVE MEMBERS ----------------------------------------------- */}
      {inactiveMembers.length > 0 && (
        <section id="inactive" className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">🕊️ Haven&apos;t seen in a while</h2>
            <span className="text-xs text-neutral-500">
              {inactiveMembers.length}
            </span>
          </div>
          <ul className="divide-y divide-neutral-800">
            {inactiveMembers.slice(0, INACTIVE_CAP).map((m) => (
              <li
                key={m.member_id}
                className="flex items-center justify-between py-2 gap-2"
              >
                <Link
                  href={`/dashboard/member/${m.member_id}`}
                  className="font-medium truncate hover:text-brand min-w-0"
                >
                  {m.name}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-neutral-500">
                    {m.daysSince === null
                      ? "never"
                      : `${m.daysSince}d ago`}
                  </span>
                  <WhatsAppReminderButton
                    name={m.name}
                    phone={m.phone}
                    variant="inactive"
                  />
                </div>
              </li>
            ))}
          </ul>
          {inactiveMembers.length > INACTIVE_CAP && (
            <Link href="#members" className="text-xs text-brand underline self-start">
              View all {inactiveMembers.length} →
            </Link>
          )}
        </section>
      )}

      {/* ALL MEMBERS ---------------------------------------------------- */}
      <h2 id="members" className="text-lg font-semibold">
        Members
      </h2>

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
        className="card flex flex-col gap-1 hover:border-brand"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{m.name}</p>
          <span className={`badge-${s.tone} shrink-0`}>{s.label}</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-neutral-400 truncate">
            {m.plan ?? "No plan"} · expires{" "}
            <span className="text-neutral-200">
              {fmtDate(m.subscription_expires_at)}
            </span>
          </span>
          {m.current_streak >= 3 && (
            <span className="shrink-0 text-orange-400 font-medium">
              🔥 {m.current_streak}
            </span>
          )}
        </div>

        <div className="text-[11px] text-neutral-500">
          {m.visits_this_month} this month · {m.total_visits} total · last{" "}
          {fmtDate(m.last_visit_at)}
        </div>
      </Link>
    </li>
  );
}

function RenewalRow({
  m,
  tone,
}: {
  m: MemberStat;
  tone: "bad" | "warn";
}) {
  return (
    <li className="flex items-center justify-between py-2 gap-2">
      <Link
        href={`/dashboard/member/${m.member_id}`}
        className="font-medium truncate hover:text-brand min-w-0"
      >
        {m.name}
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`badge-${tone}`}>
          {fmtDate(m.subscription_expires_at)}
        </span>
        <WhatsAppReminderButton
          name={m.name}
          phone={m.phone}
          expiresAt={m.subscription_expires_at!}
        />
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "brand";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-400"
      : tone === "brand"
      ? "text-brand"
      : "text-neutral-100";
  return (
    <div className="card text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
