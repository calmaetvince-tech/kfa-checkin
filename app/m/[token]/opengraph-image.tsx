import { ImageResponse } from "next/og";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Kallistis Fight Academy member";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#d4a017";
const INK = "#0a0a0a";

export default async function Image({
  params,
}: {
  params: { token: string };
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let name = "Member";
  let gymName = "Kallistis Fight Academy";
  let streak = 0;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.rpc("get_member_by_token", {
      p_token: params.token,
    });
    const member = (data as
      | { id: string; name: string; gym_name: string | null }[]
      | null)?.[0];
    if (member) {
      name = member.name;
      gymName = member.gym_name ?? gymName;
      const { data: s } = await supabase.rpc("get_member_streak", {
        p_member_id: member.id,
      });
      streak =
        (s as { current_streak_days: number }[] | null)?.[0]
          ?.current_streak_days ?? 0;
    }
  } catch {
    // fall through to defaults
  }

  // Logo fetched at runtime from the deployed origin (no fs tracing needed).
  let logoSrc: string | null = null;
  try {
    const res = await fetch(`${appUrl}/icons/icon-512.png`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      logoSrc = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
    }
  } catch {
    // omit logo if unreachable
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: INK,
          padding: "0 80px",
          borderTop: `8px solid ${GOLD}`,
          borderBottom: `8px solid ${GOLD}`,
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt="logo"
            width={360}
            height={360}
            style={{ marginRight: 60 }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#9ca3af",
              fontSize: 30,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {gymName}
          </div>
          <div
            style={{
              color: "white",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 8,
            }}
          >
            {name}
          </div>
          {streak > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: GOLD,
                  color: INK,
                  fontSize: 38,
                  fontWeight: 800,
                  padding: "10px 26px",
                  borderRadius: 999,
                }}
              >
                {streak} day streak
              </div>
            </div>
          ) : (
            <div style={{ color: GOLD, fontSize: 34, marginTop: 24 }}>
              Member check-in
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
