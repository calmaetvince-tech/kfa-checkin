"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";

export async function addClass(formData: FormData) {
  const { supabase } = await requireOwner();

  const dow = Number(formData.get("dow"));
  const start = String(formData.get("start_time") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isInteger(dow) || dow < 0 || dow > 6) return;
  if (!/^\d{2}:\d{2}$/.test(start) || !title) return;

  const { data: gymId } = await supabase.rpc("current_gym_id");
  if (!gymId) return;

  await supabase.from("class_schedule").insert({
    gym_id: gymId,
    dow,
    start_time: start,
    title,
  });

  revalidatePath("/dashboard/schedule");
}

export async function deleteClass(formData: FormData) {
  const { supabase } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("class_schedule").delete().eq("id", id);
  revalidatePath("/dashboard/schedule");
}
