"use server";

import { requireOwner } from "@/lib/auth";

export type CheckInResult =
  | {
      ok: true;
      member: {
        id: string;
        name: string;
        subscription_expires_at: string | null;
      };
      visitsThisMonth: number;
      lastVisitAt: string;
    }
  | { ok: false; error: string };

function extractToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept either a /m/<token> URL or the raw token
  const match = trimmed.match(/\/m\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{8,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function recordCheckIn(qrPayload: string): Promise<CheckInResult> {
  const token = extractToken(qrPayload);
  if (!token) return { ok: false, error: "Unrecognized QR payload" };

  const { supabase } = await requireOwner();

  const { data: member, error: mErr } = await supabase
    .from("members")
    .select("id, name, subscription_expires_at")
    .eq("qr_token", token)
    .maybeSingle();

  if (mErr) return { ok: false, error: mErr.message };
  if (!member) return { ok: false, error: "No member matches that QR" };

  const { data: ci, error: ciErr } = await supabase
    .from("check_ins")
    .insert({ member_id: member.id })
    .select("checked_in_at")
    .single();

  if (ciErr) return { ok: false, error: ciErr.message };

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const { count } = await supabase
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("member_id", member.id)
    .gte("checked_in_at", startOfMonth);

  return {
    ok: true,
    member,
    visitsThisMonth: count ?? 0,
    lastVisitAt: ci.checked_in_at,
  };
}
