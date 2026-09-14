"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { subscriptionWindow } from "@/lib/import-parse";

export async function addMember(formData: FormData) {
  const { supabase } = await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const plan = String(formData.get("plan") ?? "").trim() || null;
  const discipline =
    String(formData.get("discipline") ?? "").trim() || null;
  const dob = String(formData.get("date_of_birth") ?? "").trim() || null;
  const ecName =
    String(formData.get("emergency_contact_name") ?? "").trim() || null;
  const ecPhone =
    String(formData.get("emergency_contact_phone") ?? "").trim() || null;

  const monthsRaw = Number(formData.get("months") ?? 0);
  const months = Number.isFinite(monthsRaw)
    ? Math.max(0, Math.min(24, monthsRaw))
    : 0;

  if (!name) {
    redirect("/dashboard/add?err=" + encodeURIComponent("Name is required"));
  }

  // Shared with the bulk import so both paths clamp to the end of the target
  // month: adding a month to 31 January must land on 28 February, not 3 March.
  const { renewedAt, expiresAt } = subscriptionWindow(null, months);

  const { data, error } = await supabase
    .from("members")
    .insert({
      name,
      email,
      phone,
      notes,
      plan,
      discipline,
      date_of_birth: dob,
      emergency_contact_name: ecName,
      emergency_contact_phone: ecPhone,
      subscription_renewed_at: renewedAt,
      subscription_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/dashboard/add?err=" + encodeURIComponent(error.message));
  }

  redirect(`/dashboard/member/${data!.id}?just_created=1`);
}
