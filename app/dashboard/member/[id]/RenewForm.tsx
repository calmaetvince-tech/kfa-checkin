"use client";

import { useState } from "react";
import { renewSubscription } from "./actions";

// Revenue only ever appears on the dashboard if the amount is typed here, and
// an empty box is easy to skip when the member is standing in front of you.
// Preset chips make recording the payment one tap instead of one decision.
const PRESETS = [40, 50, 100, 200];

export function RenewForm({ memberId }: { memberId: string }) {
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState("");

  return (
    <form action={renewSubscription} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={memberId} />

      <div className="flex items-end gap-2">
        <div className="w-24">
          <label htmlFor="months" className="mb-1 block text-xs text-neutral-500">
            Months
          </label>
          <input
            id="months"
            name="months"
            type="number"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value) || 1)}
            min={1}
            max={24}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="amount" className="mb-1 block text-xs text-neutral-500">
            Paid (€)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="40"
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary">
          Renew
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className={
              "rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95 " +
              (amount === String(p)
                ? "border-brand bg-brand/20 text-brand"
                : "border-neutral-700 text-neutral-400 hover:text-neutral-100")
            }
          >
            €{p}
          </button>
        ))}
        {amount && (
          <button
            type="button"
            onClick={() => setAmount("")}
            className="text-xs text-neutral-500 underline"
          >
            καθάρισε
          </button>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        {amount
          ? `Θα καταγραφεί πληρωμή €${amount} — μπαίνει στα έσοδα του μήνα.`
          : "Χωρίς ποσό η ανανέωση γίνεται κανονικά, αλλά δεν μετράει στα έσοδα."}
      </p>
    </form>
  );
}
