import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Serves a member's profile photo as a real image (decoded from the stored
// data-URI) so lists can use plain <img> tags with browser caching.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.rpc("get_member_photo", {
    p_member_id: params.id,
  });
  if (error || !data) return new NextResponse(null, { status: 404 });

  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(data as string);
  if (!m) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      // short-lived cache; <img> URLs carry ?v=<photo_updated_at> to bust
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
