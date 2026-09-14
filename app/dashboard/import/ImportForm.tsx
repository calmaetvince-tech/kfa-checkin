"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { parseMembersInput } from "@/lib/import-parse";
import { importMembers, type ImportOutcome } from "./actions";

const EXAMPLE = `Μαρία Παπαδοπούλου, 6971234567, 1/9/2026, 3, 14/5/1998
Γιώργος Νικολάου, 6987654321, 15/9/2026, 1, 2/11/1990
Ελένη Δήμου, 6944112233, 1/10/2026, 12, 30/7/2005`;

function fmtGreek(iso: string | null): string {
  if (!iso) return "σήμερα";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ImportForm() {
  const [text, setText] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  // Same parser the server will run, so the preview is the truth.
  const parsed = useMemo(() => parseMembersInput(text), [text]);
  const rows = parsed.rows;
  const bad = rows.filter((r) => r.errors.length > 0 || r.duplicateOf !== null);
  const good = rows.filter((r) => r.errors.length === 0 && r.duplicateOf === null);

  function onImport() {
    startTransition(async () => {
      setResult(await importMembers(text, { skipExistingNames: skipExisting }));
    });
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <section className="card border-emerald-700 bg-emerald-950/30 flex flex-col gap-2">
          <h2 className="font-display text-2xl text-emerald-300">
            ✓ Μπήκαν {result.inserted.length} μέλη
          </h2>
          <ul className="flex flex-col divide-y divide-neutral-800/80">
            {result.inserted.map((m) => (
              <li key={m.id} className="py-2">
                <Link
                  href={`/dashboard/member/${m.id}`}
                  className="font-medium hover:text-brand"
                >
                  {m.name} <span className="text-xs text-neutral-500">→ QR</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {result.skipped.length > 0 && (
          <section className="card border-amber-800/60 flex flex-col gap-2">
            <h3 className="font-semibold text-amber-300">
              ⚠️ {result.skipped.length} παραλείφθηκαν
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {result.skipped.map((s, i) => (
                <li key={i} className="text-neutral-400">
                  <span className="text-neutral-500">Γρ. {s.line}</span>{" "}
                  <span className="text-neutral-200">{s.name || "—"}</span> ·{" "}
                  {s.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex gap-2">
          <Link href="/dashboard" className="btn-primary flex-1 text-center">
            Στο dashboard
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setText("");
            }}
            className="btn-ghost flex-1"
          >
            Άλλη παρτίδα
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">1. Επικόλλησε τη λίστα</h2>
        <p className="text-xs text-neutral-500">
          Μία γραμμή ανά μέλος, χωρισμένα με κόμμα:
          <br />
          <code className="text-neutral-400">
            Όνομα, Τηλέφωνο, Έναρξη συνδρομής, Μήνες, Γενέθλια
          </code>
          <br />
          Μόνο το όνομα είναι υποχρεωτικό. Οι ημερομηνίες διαβάζονται ελληνικά
          (<strong>ΗΜΕΡΑ/ΜΗΝΑΣ/ΕΤΟΣ</strong>) — το 3/4/2026 είναι 3 Απριλίου.
          <br />
          Βάλε τα γενέθλια τώρα που έχεις τη λίστα: χωρίς αυτά δεν δουλεύει η
          υπενθύμιση γενεθλίων.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          className="input font-mono text-sm"
          placeholder={EXAMPLE}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="btn-ghost text-xs"
          >
            Δοκίμασε με παράδειγμα
          </button>
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="btn-ghost text-xs"
            >
              Καθάρισε
            </button>
          )}
        </div>
      </section>

      {rows.length > 0 && (
        <section className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand">2. Έλεγξε</h2>
            <span className="text-xs text-neutral-500">
              {good.length} έτοιμα
              {bad.length > 0 && ` · ${bad.length} με πρόβλημα`}
            </span>
          </div>

          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <th className="px-2 py-1 font-medium">Όνομα</th>
                  <th className="px-2 py-1 font-medium">Τηλέφωνο</th>
                  <th className="px-2 py-1 font-medium">Έναρξη</th>
                  <th className="px-2 py-1 font-medium">Πλάνο</th>
                  <th className="px-2 py-1 font-medium">Γενέθλια</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {rows.map((r) => {
                  const problem =
                    r.errors.length > 0 || r.duplicateOf !== null;
                  return (
                    <tr
                      key={r.line}
                      className={problem ? "bg-rose-950/30" : undefined}
                    >
                      <td className="px-2 py-2">
                        <span className="font-medium">{r.name || "—"}</span>
                        {problem && (
                          <p className="text-[11px] text-rose-300">
                            {[
                              ...r.errors,
                              r.duplicateOf !== null
                                ? `διπλό με τη γραμμή ${r.duplicateOf}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-400 tabular-nums">
                        {r.phone ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-neutral-400 tabular-nums">
                        {fmtGreek(r.startDate)}
                      </td>
                      <td className="px-2 py-2 text-neutral-400">
                        {r.months > 0 ? `${r.plan} · ${r.months}μ` : "Drop-in"}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-neutral-400">
                        {r.dateOfBirth ? fmtGreek(r.dateOfBirth) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {bad.length > 0 && (
            <p className="text-xs text-amber-300">
              Οι κόκκινες γραμμές θα παραλειφθούν. Διόρθωσέ τες παραπάνω αν τις
              θέλεις.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
              className="h-4 w-4 accent-[#d4a017]"
            />
            Παράλειψε όσους υπάρχουν ήδη με το ίδιο όνομα
          </label>
        </section>
      )}

      {result && !result.ok && result.message && (
        <p className="card border-rose-800 text-sm text-rose-300">
          {result.message}
        </p>
      )}

      <button
        onClick={onImport}
        disabled={pending || good.length === 0}
        className="btn-primary py-3 text-lg disabled:opacity-40"
      >
        {pending
          ? "Εισαγωγή…"
          : good.length === 0
          ? "Επικόλλησε μια λίστα πρώτα"
          : `✓ Πρόσθεσε ${good.length} μέλη`}
      </button>
    </div>
  );
}
