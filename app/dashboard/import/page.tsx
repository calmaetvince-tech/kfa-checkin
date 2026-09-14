import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireOwner();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="section-title font-display text-2xl tracking-wide">
          Μαζική εισαγωγή μελών
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Πρόσθεσε όλο τον σύλλογο με μία κίνηση, αντί ένα-ένα.
        </p>
      </div>

      <ImportForm />

      <Link href="/dashboard/add" className="text-xs text-brand underline">
        ← Προσθήκη ενός μέλους με τη φόρμα
      </Link>
    </div>
  );
}
