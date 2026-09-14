"use client";

import { useState } from "react";
import { updateMember } from "./actions";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  plan: string | null;
  discipline: string | null;
  language: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
};

const PROGRAMS = ["Muay Thai", "Kids", "Private"];
const PLANS = ["Drop-in", "Monthly", "Quarterly", "6-month", "Annual"];

// Collapsed by default: the member page is mostly a read-only reference the
// owner opens mid-class, and a permanently open form of eleven inputs would
// bury the QR and the renew button under it.
export function EditMemberForm({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost w-full text-sm"
      >
        ✏️ Επεξεργασία στοιχείων
      </button>
    );
  }

  return (
    <form
      action={updateMember}
      className="card flex flex-col gap-3 border-brand/40"
    >
      <input type="hidden" name="id" value={member.id} />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-brand">✏️ Επεξεργασία στοιχείων</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 underline"
        >
          Άκυρο
        </button>
      </div>

      <Field label="Ονοματεπώνυμο *">
        <input
          name="name"
          required
          defaultValue={member.name}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Τηλέφωνο">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={member.phone ?? ""}
            placeholder="6971234567"
            className="input"
          />
        </Field>
        <Field label="Γενέθλια">
          <input
            name="date_of_birth"
            type="date"
            defaultValue={member.date_of_birth ?? ""}
            className="input"
          />
        </Field>
      </div>

      <Field label="Email">
        <input
          name="email"
          type="email"
          inputMode="email"
          defaultValue={member.email ?? ""}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Πρόγραμμα">
          <select
            name="discipline"
            defaultValue={member.discipline ?? ""}
            className="input"
          >
            <option value="">—</option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Πλάνο">
          <select name="plan" defaultValue={member.plan ?? ""} className="input">
            <option value="">—</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {/* Keep a value the import or an older edit produced. */}
            {member.plan && !PLANS.includes(member.plan) && (
              <option value={member.plan}>{member.plan}</option>
            )}
          </select>
        </Field>
      </div>

      <Field label="Γλώσσα της σελίδας του μέλους">
        <select
          name="language"
          defaultValue={member.language ?? ""}
          className="input"
        >
          <option value="">Ελληνικά (προεπιλογή)</option>
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Επείγον — όνομα">
          <input
            name="emergency_contact_name"
            defaultValue={member.emergency_contact_name ?? ""}
            className="input"
          />
        </Field>
        <Field label="Επείγον — τηλέφωνο">
          <input
            name="emergency_contact_phone"
            type="tel"
            inputMode="tel"
            defaultValue={member.emergency_contact_phone ?? ""}
            className="input"
          />
        </Field>
      </div>

      <Field label="Σημειώσεις">
        <textarea
          name="notes"
          rows={3}
          defaultValue={member.notes ?? ""}
          placeholder="Τραυματισμοί, στόχοι, ό,τι θες να θυμάσαι…"
          className="input"
        />
      </Field>

      <button type="submit" className="btn-primary py-2.5">
        ✓ Αποθήκευση
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
