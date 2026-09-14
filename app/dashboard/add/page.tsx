import Link from "next/link";
import { addMember } from "./actions";
import { requireOwner } from "@/lib/auth";
import { AddMemberForm } from "./AddMemberForm";

export const dynamic = "force-dynamic";

export default async function AddMemberPage({
  searchParams,
}: {
  searchParams: { err?: string };
}) {
  await requireOwner();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Add member</h1>
      <p className="text-sm text-neutral-400">
        Fill what you know — only the name is required. You can edit the rest later.
      </p>

      {searchParams.err && (
        <div className="badge-bad rounded-lg p-3 text-sm">{searchParams.err}</div>
      )}

      <Link
        href="/dashboard/import"
        className="card flex items-center justify-between gap-3 hover:border-brand"
      >
        <div>
          <p className="font-medium">📋 Έχεις πολλά μέλη μαζί;</p>
          <p className="text-xs text-neutral-500">
            Επικόλλησε ονόματα, τηλέφωνα και ημερομηνίες και μπαίνουν όλα με μία
            κίνηση.
          </p>
        </div>
        <span className="shrink-0 text-xl text-brand">→</span>
      </Link>

      <AddMemberForm action={addMember} />
    </div>
  );
}
