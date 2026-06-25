import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { statusLabel, fmtDate, fmtDateTime } from "@/lib/format";
import { rateLimit } from "@/lib/ratelimit";
import { memberGreeting } from "@/lib/greeting";
import { Logo } from "@/components/Logo";
import { Heatmap } from "@/components/Heatmap";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MemberTokenSaver } from "@/components/MemberTokenSaver";
import { ForgetDeviceButton } from "@/components/ForgetDeviceButton";
import { CheckInWatcher } from "@/components/CheckInWatcher";
import { CelebrationDemo } from "@/components/CelebrationDemo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.rpc("get_member_by_token", {
    p_token: params.token,
  });
  const member = (data as { name: string; gym_name: string | null }[] | null)?.[0];
  const name = member?.name ?? "Member";
  const gymName = member?.gym_name ?? "Kallistis Fight Academy";
  const title = `${name} — ${gymName} Check-in`;
  const description = `${name}'s personal check-in QR for ${gymName}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ogImage = `${appUrl}/brand/og-image.png`;
  return {
    title,
    description,
    // Override the global manifest with a per-member one whose start_url is
    // this member's QR page — so the home-screen icon opens directly here.
    manifest: `/m/${params.token}/manifest.webmanifest`,
    // Branded KFA link-preview card (logo + "time to train").
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

type MemberRow = {
  id: string;
  name: string;
  qr_token: string;
  subscription_renewed_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  visits_this_month: number;
  visits_all_time: number;
  gym_id: string | null;
  gym_name: string | null;
  date_of_birth: string | null;
  language: string | null;
};

type VisitRow = { id: string; checked_in_at: string };

type StreakRow = {
  current_streak_days: number;
  longest_streak_days: number;
};

export default async function MemberSelfPage({
  params,
}: {
  params: { token: string };
}) {
  // Throttle the public page per IP (no-op unless Upstash is configured).
  const hdrs = headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ||
    hdrs.get("x-real-ip") ||
    "anon";
  const { success: allowed } = await rateLimit(`m:${ip}`);
  if (!allowed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-center">
        <h1 className="text-xl font-bold">Slow down a sec</h1>
        <p className="text-sm text-neutral-400 max-w-sm">
          Too many requests from your network. Wait a minute and refresh.
        </p>
      </main>
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: memberRows } = await supabase.rpc("get_member_by_token", {
    p_token: params.token,
  });
  const member = (memberRows as MemberRow[] | null)?.[0];
  if (!member) notFound();

  const { data: visitsData } = await supabase.rpc("get_member_visits", {
    p_token: params.token,
    p_limit: 20,
  });
  const recentVisits = (visitsData as VisitRow[] | null) ?? [];

  const { data: streakData } = await supabase.rpc("get_member_streak", {
    p_member_id: member.id,
  });
  const streak = (streakData as StreakRow[] | null)?.[0] ?? {
    current_streak_days: 0,
    longest_streak_days: 0,
  };

  const { data: activeDaysData } = await supabase.rpc(
    "get_member_active_days",
    { p_token: params.token, p_days: 30 }
  );
  const activeDays = ((activeDaysData as { active_day: string }[] | null) ?? [])
    .map((r) => r.active_day);

  const s = statusLabel(member.subscription_expires_at);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const myUrl = `${appUrl}/m/${member.qr_token}`;

  const greeting = memberGreeting({
    name: member.name,
    language: member.language,
    streak: streak.current_streak_days,
    dateOfBirth: member.date_of_birth,
    expiresAt: member.subscription_expires_at,
    createdAt: member.created_at,
    visitsAllTime: member.visits_all_time,
    lastVisitAt: recentVisits[0]?.checked_in_at ?? null,
  });

  return (
    <main className="flex flex-col gap-4 pt-2">
      <MemberTokenSaver token={member.qr_token} />
      <CheckInWatcher
        token={member.qr_token}
        memberId={member.id}
        initialVisits={member.visits_all_time}
        lang={member.language === "en" ? "en" : "el"}
      />
      <Suspense fallback={null}>
        <CelebrationDemo />
      </Suspense>

      {/* Personalized time-aware greeting — feels like the page is talking. */}
      <section className="rounded-xl bg-brand/10 border border-brand/20 px-4 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold text-neutral-100">
            {greeting.greeting}
          </span>{" "}
          <span className="text-neutral-300">{greeting.context}</span>
        </p>
      </section>

      <header className="text-center flex flex-col items-center gap-2">
        <Logo size="lg" />
        <h1 className="text-2xl font-bold">{member.name}</h1>
        <div className="mt-1">
          <span className={`badge-${s.tone}`}>{s.label}</span>
        </div>
      </header>

      <InstallPrompt />

      <section className="card flex flex-col gap-3 items-center">
        <p className="text-xs text-neutral-500">Show this at the front desk</p>
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={myUrl} size={220} />
        </div>
        <p className="text-xs text-neutral-500 text-center">
          Add this page to your phone&apos;s home screen
          <br />
          <span className="text-neutral-600">
            (Share → Add to Home Screen)
          </span>
        </p>
      </section>

      {streak.current_streak_days > 0 && (
        <section className="card flex items-center justify-center gap-3 bg-gradient-to-br from-brand/15 to-transparent border-brand/30">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="text-2xl font-bold text-brand leading-none">
              {streak.current_streak_days} day
              {streak.current_streak_days === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-neutral-400">
              current streak · best {streak.longest_streak_days}
            </p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand">
            {member.visits_this_month}
          </p>
          <p className="text-xs text-neutral-500">This month</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold">{member.visits_all_time}</p>
          <p className="text-xs text-neutral-500">All-time</p>
        </div>
      </section>

      <Heatmap activeDays={activeDays} />

      <section className="card flex flex-col gap-2 text-sm">
        <h2 className="font-semibold">Subscription</h2>
        <div className="flex justify-between">
          <span className="text-neutral-500">Last renewed</span>
          <span>{fmtDate(member.subscription_renewed_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Expires</span>
          <span>{fmtDate(member.subscription_expires_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Member since</span>
          <span>{fmtDate(member.created_at)}</span>
        </div>
      </section>

      <section className="card flex flex-col gap-2 text-sm">
        <h2 className="font-semibold">Recent visits</h2>
        <ul className="divide-y divide-neutral-800">
          {recentVisits.map((c) => (
            <li key={c.id} className="py-1.5">
              {fmtDateTime(c.checked_in_at)}
            </li>
          ))}
          {recentVisits.length === 0 && (
            <li className="py-2 text-neutral-500">
              No visits yet — see you soon!
            </li>
          )}
        </ul>
      </section>

      <ForgetDeviceButton />

      <footer className="text-center text-xs text-neutral-600 pt-2">
        {member.gym_name ?? "Kallistis Fight Academy"}
      </footer>
    </main>
  );
}
