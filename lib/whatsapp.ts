// Helpers for one-tap WhatsApp owner→member messages.

export type Lang = "el" | "en";

// Normalize to international format. Greek defaults:
//   strip spaces / dashes / parentheses;
//   leading 0  -> +30 (drop the 0);
//   no leading + -> prepend +30.
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("0")) {
    p = "+30" + p.slice(1);
  } else if (!p.startsWith("+")) {
    p = "+30" + p;
  }
  return p;
}

// wa.me wants digits only (no leading +).
export function waDigits(raw: string): string {
  return normalizePhone(raw).replace(/\D/g, "");
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
  const text = encodeURIComponent(renewalMessage(name, expiresAt));
  return `https://wa.me/${waDigits(phone)}?text=${text}`;
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
  const text = encodeURIComponent(inactiveMessage(name, lang));
  return `https://wa.me/${waDigits(phone)}?text=${text}`;
}
