import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireOwner() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/login?error=not_admin");
  return { user, supabase };
}
