import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { statusLabel, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type MemberStat = {
  member_id: string;
  name: string;
  plan: string | null;
  subscription_renewed_at: string | null;
  subscription_expires_at: string | null;
  visits_this_month: number;
  last_visit_at: string | null;
};

type TodayCheckIn = {
  id: string;
  checked_in_at: string;
  member_id: string;
  members: { name: string } | { name: string }[] | null;
};

function memberName(m: TodayCheckIn["members"]): string {
  if (!m) return "Member";
  return Array.isArray(m) ? m[0]?.name ?? "Member" : m.name;
}

export default async function DashboardPage() {
  const { supabase } = await requireOwner();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: members, error }, { data: todayRaw }] = await Promise.all([
    supabase
      .from("member_month_stats")
      .select("*")
      .order("name", { ascending: true })
      .returns<MemberStat[]>(),
    supabase
      .from("check_ins")
      .select("id, checked_in_at, member_id, members(name)")
      .gte("checked_in_at", startOfToday.toISOString())
      .order("checked_in_at", { ascending: false })
      .limit(100)
      .returns<TodayCheckIn[]>(),
  ]);

  if (error) {
    return (
      <div className="card text-rose-600">
        Failed to load members: {error.message}
      </div>
    );
  }

  const list = members ?? [];
  const today = todayRaw ?? [];

  const now = Date.now();
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

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Members" value={list.length} />
        <Stat label="Active subs" value={activeCount} tone="ok" />
        <Stat label="Today" value={today.length} tone="brand" />
      </section>

      {/* TODAY'S CHECK-INS FEED ----------------------------------------- */}
      <section className="card flex flex-col gap-2">
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
        <section className="card flex flex-col gap-2 border-amber-800/60">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-amber-300">
              💰 Renewals due (next 7 days)
            </h2>
            <span className="text-xs text-neutral-500">{nearExpiry.length}</span>
          </div>
          <ul className="divide-y divide-neutral-800">
            {nearExpiry.map((m) => (
              <li key={m.member_id}>
                <Link
                  href={`/dashboard/member/${m.member_id}`}
                  className="flex items-center justify-between py-2 gap-3 hover:text-brand"
                >
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="badge-warn shrink-0">
                    {fmtDate(m.subscription_expires_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ALL MEMBERS ---------------------------------------------------- */}
      <h2 className="text-lg font-semibold">Members</h2>

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
        {list.map((m) => {
          const s = statusLabel(m.subscription_expires_at);
          return (
            <li key={m.member_id}>
              <Link
                href={`/dashboard/member/${m.member_id}`}
                className="card flex items-center justify-between gap-3 hover:border-brand"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-neutral-500">
                    {m.plan ? `${m.plan} · ` : ""}
                    {m.visits_this_month} visit
                    {m.visits_this_month === 1 ? "" : "s"} this month · last{" "}
                    {fmtDate(m.last_visit_at)}
                  </p>
                </div>
                <span className={`badge-${s.tone} shrink-0`}>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
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
