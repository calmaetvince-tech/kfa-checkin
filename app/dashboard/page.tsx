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

export default async function DashboardPage() {
  const { supabase } = await requireOwner();

  const { data: members, error } = await supabase
    .from("member_month_stats")
    .select("*")
    .order("name", { ascending: true })
    .returns<MemberStat[]>();

  if (error) {
    return (
      <div className="card text-rose-600">
        Failed to load members: {error.message}
      </div>
    );
  }

  const list = members ?? [];
  const activeCount = list.filter(
    (m) =>
      m.subscription_expires_at &&
      new Date(m.subscription_expires_at).getTime() > Date.now()
  ).length;
  const checkedInToday = list.filter(
    (m) =>
      m.last_visit_at &&
      new Date(m.last_visit_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Members" value={list.length} />
        <Stat label="Active subs" value={activeCount} tone="ok" />
        <Stat label="Today" value={checkedInToday} tone="brand" />
      </section>

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
