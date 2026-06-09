"use client";

import { useState } from "react";

const PRESETS: { label: string; months: number; plan: string }[] = [
  { label: "Drop-in", months: 0, plan: "Drop-in" },
  { label: "1 month", months: 1, plan: "Monthly" },
  { label: "3 months", months: 3, plan: "Quarterly" },
  { label: "6 months", months: 6, plan: "6-month" },
  { label: "12 months", months: 12, plan: "Annual" },
];

const PROGRAMS = ["Muay Thai", "Kids", "Private"];

export function AddMemberForm({
  action,
}: {
  action: (fd: FormData) => Promise<void>;
}) {
  const [presetIdx, setPresetIdx] = useState<number | "custom">(1);
  const [customMonths, setCustomMonths] = useState(1);
  const months =
    presetIdx === "custom" ? customMonths : PRESETS[presetIdx].months;
  const plan =
    presetIdx === "custom" ? "Custom" : PRESETS[presetIdx].plan;

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* IDENTITY ---------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">1. Who are they?</h2>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="name">
            Full name <span className="text-rose-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            className="input"
            placeholder="e.g. Maria Papadopoulou"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="dob">
            Date of birth
          </label>
          <input id="dob" name="date_of_birth" type="date" className="input" />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="discipline">
            Program
          </label>
          <select id="discipline" name="discipline" defaultValue="Muay Thai" className="input">
            {PROGRAMS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            Muay Thai = adult group classes. Kids = kids classes. Private = 1-on-1 coaching.
          </p>
        </div>
      </section>

      {/* CONTACT ----------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">2. Contact</h2>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="input"
            placeholder="+30 69x xxx xxxx"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="input"
            placeholder="member@email.com"
          />
        </div>
      </section>

      {/* EMERGENCY --------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">3. Emergency contact</h2>
        <p className="text-xs text-neutral-500 -mt-2">
          Recommended for combat sports. Skip if you don&apos;t have it now.
        </p>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="ec_name">
            Name
          </label>
          <input
            id="ec_name"
            name="emergency_contact_name"
            className="input"
            placeholder="Spouse, parent, friend…"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="ec_phone">
            Phone
          </label>
          <input
            id="ec_phone"
            name="emergency_contact_phone"
            type="tel"
            inputMode="tel"
            className="input"
          />
        </div>
      </section>

      {/* SUBSCRIPTION ------------------------------------------------------ */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">4. Subscription</h2>
        <p className="text-xs text-neutral-500 -mt-2">
          Tap a preset. You can change or extend later.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPresetIdx(i)}
              className={
                "btn " +
                (presetIdx === i
                  ? "bg-brand text-brand-ink font-semibold"
                  : "border border-neutral-700 hover:bg-neutral-900")
              }
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPresetIdx("custom")}
            className={
              "btn col-span-2 " +
              (presetIdx === "custom"
                ? "bg-brand text-brand-ink font-semibold"
                : "border border-neutral-700 hover:bg-neutral-900")
            }
          >
            Custom number of months
          </button>
        </div>

        {presetIdx === "custom" && (
          <div>
            <label
              className="text-sm font-medium block mb-1"
              htmlFor="custom_months"
            >
              How many months?
            </label>
            <input
              id="custom_months"
              type="number"
              min={1}
              max={24}
              value={customMonths}
              onChange={(e) => setCustomMonths(Number(e.target.value) || 1)}
              className="input"
            />
          </div>
        )}

        {/* Hidden fields posted to the server */}
        <input type="hidden" name="months" value={months} />
        <input type="hidden" name="plan" value={plan} />

        <p className="text-xs text-neutral-500">
          Selected:{" "}
          <span className="text-neutral-300 font-medium">{plan}</span>
          {months > 0 && ` · ${months} month${months === 1 ? "" : "s"}`}
        </p>
      </section>

      {/* NOTES ------------------------------------------------------------- */}
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold text-brand">5. Notes (optional)</h2>
        <textarea
          name="notes"
          rows={3}
          className="input"
          placeholder="Injuries, goals, anything you want to remember…"
        />
      </section>

      <button type="submit" className="btn-primary text-lg py-3">
        ✓ Create member &amp; show QR
      </button>
    </form>
  );
}
