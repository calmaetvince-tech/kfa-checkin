"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { parseMembersInput, subscriptionWindow } from "@/lib/import-parse";

export type ImportOutcome = {
  ok: boolean;
  inserted: { id: string; name: string }[];
  skipped: { line: number; name: string; reason: string }[];
  message?: string;
};

const MAX_ROWS = 500;
const CHUNK = 50;

/**
 * Insert every valid pasted row. The text is re-parsed here rather than
 * trusting a row list from the browser, so the preview cannot be edited in
 * devtools into something the parser would have rejected.
 */
export async function importMembers(
  text: string,
  opts: { skipExistingNames: boolean }
): Promise<ImportOutcome> {
  const { supabase } = await requireOwner();

  const { rows } = parseMembersInput(text ?? "");
  if (rows.length === 0) {
    return { ok: false, inserted: [], skipped: [], message: "Δεν βρήκα καμία γραμμή." };
  }
  if (rows.length > MAX_ROWS) {
    return {
      ok: false,
      inserted: [],
      skipped: [],
      message: `Πολλές γραμμές (${rows.length}). Το όριο είναι ${MAX_ROWS} τη φορά.`,
    };
  }

  const skipped: ImportOutcome["skipped"] = [];
  const candidates = rows.filter((r) => {
    if (r.errors.length > 0) {
      skipped.push({ line: r.line, name: r.name, reason: r.errors.join(" · ") });
      return false;
    }
    if (r.duplicateOf !== null) {
      skipped.push({
        line: r.line,
        name: r.name,
        reason: `διπλό — ίδιο όνομα με τη γραμμή ${r.duplicateOf}`,
      });
      return false;
    }
    return true;
  });

  // Names already in this gym. RLS scopes the select to the owner's gym, so
  // this compares against their own roster only.
  if (opts.skipExistingNames && candidates.length > 0) {
    const { data: existing } = await supabase.from("members").select("name");
    const taken = new Set(
      (existing ?? []).map((m: { name: string }) => m.name.trim().toLowerCase())
    );
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (taken.has(candidates[i].name.toLowerCase())) {
        skipped.push({
          line: candidates[i].line,
          name: candidates[i].name,
          reason: "υπάρχει ήδη μέλος με αυτό το όνομα",
        });
        candidates.splice(i, 1);
      }
    }
  }

  const inserted: ImportOutcome["inserted"] = [];

  for (let i = 0; i < candidates.length; i += CHUNK) {
    const chunk = candidates.slice(i, i + CHUNK);
    const payload = chunk.map((r) => {
      const { renewedAt, expiresAt } = subscriptionWindow(r.startDate, r.months);
      return {
        name: r.name,
        phone: r.phone,
        email: r.email,
        plan: r.plan,
        discipline: r.discipline,
        subscription_renewed_at: renewedAt,
        subscription_expires_at: expiresAt,
      };
    });

    const { data, error } = await supabase
      .from("members")
      .insert(payload)
      .select("id, name");

    if (error) {
      // One bad chunk must not lose the rest: retry its rows one at a time so
      // a single offending record is reported instead of fifty.
      for (const [j, single] of payload.entries()) {
        const { data: one, error: oneErr } = await supabase
          .from("members")
          .insert(single)
          .select("id, name")
          .single();
        if (oneErr) {
          skipped.push({
            line: chunk[j].line,
            name: chunk[j].name,
            reason: oneErr.message,
          });
        } else if (one) {
          inserted.push(one);
        }
      }
      continue;
    }

    inserted.push(...(data ?? []));
  }

  revalidatePath("/dashboard");

  return { ok: true, inserted, skipped };
}
