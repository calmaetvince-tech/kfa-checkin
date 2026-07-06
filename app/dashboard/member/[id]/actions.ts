"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";

export async function renewSubscription(formData: FormData) {
  const { supabase } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const monthsRaw = Number(formData.get("months") ?? 1);
  const months = Number.isFinite(monthsRaw)
    ? Math.max(1, Math.min(24, monthsRaw))
    : 1;
  if (!id) return;

  // Extend from the later of (now, current expiry) so renewing early stacks
  const { data: existing } = await supabase
    .from("members")
    .select("subscription_expires_at")
    .eq("id", id)
    .single();

  const now = new Date();
  const startFrom =
    existing?.subscription_expires_at &&
    new Date(existing.subscription_expires_at) > now
      ? new Date(existing.subscription_expires_at)
      : now;

  const newExpiry = new Date(
    startFrom.getFullYear(),
    startFrom.getMonth() + months,
    startFrom.getDate()
  );

  await supabase
    .from("members")
    .update({
      subscription_renewed_at: now.toISOString(),
      subscription_expires_at: newExpiry.toISOString(),
    })
    .eq("id", id);

  // Record the payment when an amount was entered (revenue tracking).
  const amountRaw = Number(String(formData.get("amount") ?? "").replace(",", "."));
  if (Number.isFinite(amountRaw) && amountRaw > 0) {
    await supabase.from("payments").insert({
      member_id: id,
      amount: Math.min(amountRaw, 999999),
      months,
    });
  }

  revalidatePath(`/dashboard/member/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteMember(formData: FormData) {
  const { supabase } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("members").delete().eq("id", id);
  redirect("/dashboard");
}

export async function rotateQrToken(formData: FormData) {
  const { supabase } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Same format as the Postgres default (32-char hex)
  const newToken = randomBytes(16).toString("hex");

  await supabase
    .from("members")
    .update({ qr_token: newToken })
    .eq("id", id);

  revalidatePath(`/dashboard/member/${id}`);
}
