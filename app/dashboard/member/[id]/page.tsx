import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { requireOwner } from "@/lib/auth";
import { statusLabel, fmtDate, fmtDateTime } from "@/lib/format";
import { renewSubscription } from "./actions";
import { ShareButtons } from "./ShareButtons";
import { DangerActions } from "./DangerActions";
import { WhatsAppReminderButton } from "@/components/WhatsAppReminderButton";
import { MemberStats } from "@/components/MemberStats";
import { MonthlyHistory } from "@/components/MonthlyHistory";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { just_created?: string };
}) {
  const { supabase } = await requireOwner();

  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !member) {
    return (
      <div className="card text-rose-600">
        Member not found.{" "}
        <Link href="/dashboard" className="underline">
          Back
        </Link>
      </div>
    );
  }

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("id, checked_in_at")
    .eq("member_id", member.id)
    .order("checked_in_at", { ascending: false })
    .limit(1000);

  const allTimestamps = (checkIns ?? []).map((c) => c.checked_in_at);

  // Monthly memory (Athens months) for the owner — full year view.
  const monthlyCounts: Record<string, number> = {};
  const ymFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
  });
  for (const ts of allTimestamps) {
    const ym = ymFmt.format(new Date(ts));
    monthlyCounts[ym] = (monthlyCounts[ym] ?? 0) + 1;
  }

  const s = statusLabel(member.subscription_expires_at);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const memberUrl = `${appUrl}/m/${member.qr_token}`;
  const justCreated = searchParams.just_created === "1";

  // Show the renewal reminder when the sub is expired or expiring within 7 days.
  const expiresMs = member.subscription_expires_at
    ? new Date(member.subscription_expires_at).getTime()
    : null;
  const showRenewalReminder =
    expiresMs !== null && expiresMs <= Date.now() + 7 * 86_400_000;

  return (
    <div className="flex flex-col gap-4">
      {justCreated && (
        <div className="card border-emerald-700 bg-emerald-950/40 text-emerald-200 text-sm">
          ✓ Member created. Share the QR with them below.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{member.name}</h1>
          <p className="text-xs text-neutral-500">
            {member.discipline ?? "Member"} · since{" "}
            {fmtDate(member.created_at)}
          </p>
        </div>
        <span className={`badge-${s.tone}`}>{s.label}</span>
      </div>

      {/* QR + SHARE ------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">QR & share link</h2>
        <div className="bg-white p-4 rounded-xl self-center">
          <QRCodeSVG value={memberUrl} size={200} />
        </div>
        <code className="text-xs break-all bg-neutral-900 p-2 rounded text-neutral-400">
          {memberUrl}
        </code>
        <ShareButtons
          url={memberUrl}
          memberName={member.name}
          memberPhone={member.phone}
        />
      </section>

      {/* MEMBER VIEW PREVIEW ---------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">👁 Preview member view</h2>
        <p className="text-xs text-neutral-500">
          See exactly what {member.name.split(" ")[0]} sees on their phone —
          including the celebration that plays when you scan them.
        </p>
        <a
          href={memberUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost w-full"
        >
          Open member view ↗
        </a>
        <p className="text-xs text-neutral-500 mt-1">
          Preview the scan videos (best on a phone):
        </p>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`${memberUrl}?celebrate=first`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm py-2"
          >
            ▶ 1st scan
          </a>
          <a
            href={`${memberUrl}?celebrate=second`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm py-2"
          >
            ▶ 2nd scan
          </a>
          <a
            href={`${memberUrl}?celebrate=third`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm py-2"
          >
            ▶ 3rd+ scan
          </a>
        </div>
      </section>

      {/* SUBSCRIPTION ----------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Subscription</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-neutral-500 text-xs">Plan</p>
            <p>{member.plan ?? "—"}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">Status</p>
            <p>
              <span className={`badge-${s.tone}`}>{s.label}</span>
            </p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">Last renewed</p>
            <p>{fmtDate(member.subscription_renewed_at)}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">Expires</p>
            <p>{fmtDate(member.subscription_expires_at)}</p>
          </div>
        </div>
        {showRenewalReminder && (
          <div className="flex items-center gap-2">
            <WhatsAppReminderButton
              name={member.name}
              phone={member.phone}
              expiresAt={member.subscription_expires_at!}
            />
          </div>
        )}
        <form action={renewSubscription} className="flex gap-2 items-end">
          <input type="hidden" name="id" value={member.id} />
          <div className="flex-1">
            <label
              htmlFor="months"
              className="text-xs text-neutral-500 block mb-1"
            >
              Extend by (months)
            </label>
            <input
              id="months"
              name="months"
              type="number"
              defaultValue={1}
              min={1}
              max={24}
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary">
            Mark renewal
          </button>
        </form>
      </section>

      {/* CONTACT + EMERGENCY --------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Contact</h2>
        <div className="grid grid-cols-1 gap-1 text-sm">
          <Row label="Phone" value={member.phone} link={member.phone ? `tel:${member.phone}` : null} />
          <Row label="Email" value={member.email} link={member.email ? `mailto:${member.email}` : null} />
          <Row label="Date of birth" value={fmtDate(member.date_of_birth)} />
        </div>
        {(member.emergency_contact_name || member.emergency_contact_phone) && (
          <>
            <h3 className="font-semibold text-sm text-neutral-400 mt-2">
              Emergency contact
            </h3>
            <div className="grid grid-cols-1 gap-1 text-sm">
              <Row label="Name" value={member.emergency_contact_name} />
              <Row
                label="Phone"
                value={member.emergency_contact_phone}
                link={
                  member.emergency_contact_phone
                    ? `tel:${member.emergency_contact_phone}`
                    : null
                }
              />
            </div>
          </>
        )}
        {member.notes && (
          <>
            <h3 className="font-semibold text-sm text-neutral-400 mt-2">Notes</h3>
            <p className="text-sm text-neutral-300 whitespace-pre-wrap">
              {member.notes}
            </p>
          </>
        )}
      </section>

      {/* ATTENDANCE STATS ------------------------------------------------- */}
      <MemberStats checkIns={allTimestamps} />

      {/* MONTHLY MEMORY --------------------------------------------------- */}
      <MonthlyHistory counts={monthlyCounts} months={12} />

      {/* RECENT VISITS ---------------------------------------------------- */}
      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Recent visits</h2>
        <ul className="text-sm divide-y divide-neutral-800">
          {(checkIns ?? []).slice(0, 15).map((c) => (
            <li key={c.id} className="py-1.5">
              {fmtDateTime(c.checked_in_at)}
            </li>
          ))}
          {(checkIns ?? []).length === 0 && (
            <li className="py-2 text-neutral-500">No visits yet.</li>
          )}
        </ul>
      </section>

      <DangerActions memberId={member.id} />
    </div>
  );
}

function Row({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500 text-xs">{label}</span>
      {link && value ? (
        <a href={link} className="text-brand underline truncate">
          {value}
        </a>
      ) : (
        <span className="truncate">{value || "—"}</span>
      )}
    </div>
  );
}
