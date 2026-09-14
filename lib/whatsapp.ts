// Helpers for one-tap WhatsApp owner→member messages.

export type Lang = "el" | "en";

/**
 * The single place a stored phone becomes a wa.me number.
 *
 * Returns digits in international form (no "+"), or null when the number
 * cannot be resolved confidently — callers must then fall back to WhatsApp's
 * contact picker rather than guessing. Blindly prefixing +30 would silently
 * message a stranger in Greece whenever a foreign number was typed without
 * its country code, which matters now that numbers arrive in bulk from an
 * imported roster instead of being typed one at a time.
 */
export function waDigits(raw: string | null | undefined): string | null {
  const p = (raw ?? "").replace(/[\s\-().]/g, "");
  if (!p) return null;

  // Explicit country code, in either notation.
  if (p.startsWith("+")) {
    const d = p.slice(1).replace(/\D/g, "");
    return d.length >= 8 ? d : null;
  }
  if (p.startsWith("00")) {
    const d = p.slice(2).replace(/\D/g, "");
    return d.length >= 8 ? d : null;
  }

  const digits = p.replace(/\D/g, "");
  if (digits.length !== p.length) return null; // stray letters — not a number

  // Greek national format: 10 digits, mobile (69…) or landline (2…).
  if (digits.length === 10 && /^(69|2)/.test(digits)) return "30" + digits;

  // Legacy trunk prefix, e.g. 0697…
  if (digits.length === 11 && digits.startsWith("0") && /^(69|2)/.test(digits.slice(1))) {
    return "30" + digits.slice(1);
  }

  return null;
}

/** Display form, for hints and tooltips. */
export function normalizePhone(raw: string): string | null {
  const d = waDigits(raw);
  return d ? "+" + d : null;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// "Mon DD" in the gym's locale/timezone, e.g. "Jun 09".
export function shortExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "Europe/Athens",
  });
}

export function renewalMessage(name: string, expiresAt: string): string {
  return `Hey ${firstName(name)}! Your KFA membership expires on ${shortExpiry(
    expiresAt
  )}. Want to renew? 💪`;
}

export function waReminderHref(
  name: string,
  phone: string,
  expiresAt: string
): string {
  return waHref(waDigits(phone), renewalMessage(name, expiresAt));
}

/** wa.me link: straight to the contact when known, else the picker. */
export function waHref(digits: string | null, message: string): string {
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

// --- "we miss you" nudge for inactive members --------------------------------
export function inactiveMessage(name: string, lang: Lang): string {
  const fn = firstName(name);
  return lang === "el"
    ? `Γεια σου ${fn}! Σε χάσαμε στο γυμναστήριο 🥊 Όλα καλά? Σε περιμένουμε!`
    : `Hey ${fn}! Missed you at the gym 🥊 All good? We're waiting for you!`;
}

export function waInactiveHref(
  name: string,
  phone: string,
  lang: Lang
): string {
  return waHref(waDigits(phone), inactiveMessage(name, lang));
}

// --- birthday wish -----------------------------------------------------------
export function birthdayMessage(name: string, lang: Lang): string {
  const fn = firstName(name);
  return lang === "el"
    ? `Χρόνια πολλά ${fn}! 🎂🥊 Δώρο μας: ένα δωρεάν μάθημα σήμερα. Σε περιμένουμε!`
    : `Happy birthday ${fn}! 🎂🥊 Our gift: a free class today. See you!`;
}

export function waBirthdayHref(
  name: string,
  phone: string,
  lang: Lang
): string {
  return waHref(waDigits(phone), birthdayMessage(name, lang));
}
