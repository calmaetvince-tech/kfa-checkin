import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Per-member PWA manifest. Setting start_url to the member's URL means
// Android installs the app pointing directly at this member's QR — and
// iOS uses the page's URL anyway, so this is robust either way.
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.rpc("get_member_by_token", {
    p_token: params.token,
  });
  const member = (data as { name: string }[] | null)?.[0];
  const memberName = member?.name ?? "Member";

  const manifest = {
    name: `KFA — ${memberName}`,
    short_name: "KFA",
    description: `${memberName}'s check-in for Kallistis Fight Academy`,
    start_url: `/m/${params.token}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#d4a017",
    icons: [
      {
        src: "/icons/icon-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
  });
}
