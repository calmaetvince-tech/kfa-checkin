import { firstName, type Lang } from "./whatsapp";

// Personalized, time-aware greeting for the member page.
// All time logic is bucketed in Europe/Athens.

export type GreetingInput = {
  name: string;
  language: string | null;
  streak: number;
  dateOfBirth: string | null; // 'YYYY-MM-DD'
  expiresAt: string | null;
  createdAt: string;
  visitsAllTime: number;
  lastVisitAt: string | null; // ISO timestamp
};

function athensYMD(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

function athensHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  let h = Number(parts.find((p) => p.type === "hour")?.value);
  if (h === 24) h = 0;
  return h;
}

const DAY = 86_400_000;

export function memberGreeting(input: GreetingInput): {
  greeting: string;
  context: string;
} {
  const lang: Lang = input.language === "en" ? "en" : "el";
  const fn = firstName(input.name);
  const now = new Date();
  const nowMs = now.getTime();

  // --- greeting word ---------------------------------------------------------
  const h = athensHour(now);
  const word =
    lang === "el"
      ? h < 12
        ? "Καλημέρα"
        : h < 20
        ? "Καλησπέρα"
        : "Καληνύχτα"
      : h < 12
      ? "Good morning"
      : h < 20
      ? "Good afternoon"
      : "Good evening";

  // --- member state ----------------------------------------------------------
  const todayYMD = athensYMD(now);
  const yesterdayYMD = athensYMD(new Date(nowMs - DAY));
  const [, todayM, todayD] = todayYMD.split("-");

  const isBirthday = (() => {
    if (!input.dateOfBirth) return false;
    const [, bm, bd] = input.dateOfBirth.split("-");
    return bm === todayM && bd === todayD;
  })();

  const lastVisitMs = input.lastVisitAt
    ? new Date(input.lastVisitAt).getTime()
    : null;
  const lastVisitYMD = input.lastVisitAt
    ? athensYMD(new Date(input.lastVisitAt))
    : null;
  const cameYesterday = lastVisitYMD === yesterdayYMD;

  const expiresMs = input.expiresAt
    ? new Date(input.expiresAt).getTime()
    : null;
  const expiringSoon =
    expiresMs !== null && expiresMs > nowMs && expiresMs <= nowMs + 7 * DAY;
  const expired = expiresMs !== null && expiresMs <= nowMs;
  const activeSub = expiresMs !== null && expiresMs > nowMs;

  const absent7 = lastVisitMs === null || nowMs - lastVisitMs > 7 * DAY;
  const isNew =
    nowMs - new Date(input.createdAt).getTime() <= 7 * DAY &&
    input.visitsAllTime < 3;

  // --- context line (first match wins, in priority order) --------------------
  let context: string;
  if (isBirthday) {
    context =
      lang === "el"
        ? "🎂 Χρόνια πολλά! Όλη η ομάδα του KFA σου εύχεται!"
        : "🎂 Happy birthday! The whole KFA team is celebrating you!";
  } else if (input.streak >= 3) {
    context =
      lang === "el"
        ? `🔥 ${input.streak} μέρες σερί — μην το χαλάσεις σήμερα!`
        : `🔥 ${input.streak}-day streak — don't break it today!`;
  } else if (cameYesterday) {
    context =
      lang === "el"
        ? "💪 Ωραία προπόνηση χθες. Έτοιμος για άλλη μια?"
        : "💪 Nice session yesterday. Ready for another?";
  } else if (expiringSoon) {
    context =
      lang === "el"
        ? "⏰ Η συνδρομή σου λήγει σε λίγες μέρες — μίλα με τον Μανώλη για ανανέωση."
        : "⏰ Your membership expires soon — talk to Manolis to renew.";
  } else if (expired) {
    context =
      lang === "el"
        ? "❌ Η συνδρομή σου έχει λήξει. Μίλα με τον Μανώλη για ανανέωση."
        : "❌ Your membership has expired. Talk to Manolis to renew.";
  } else if (activeSub && absent7 && !isNew) {
    // Exclude brand-new members: a day-1 member with no visits should get the
    // welcome line (rule 7), not "we missed you".
    context =
      lang === "el"
        ? "🥊 Σε χάσαμε! Πέρασε να σε δούμε."
        : "🥊 We missed you! Come by and say hi.";
  } else if (isNew) {
    context =
      lang === "el"
        ? "🎯 Καλώς ήρθες στο KFA. Έτοιμος για την επόμενη προπόνηση?"
        : "🎯 Welcome to KFA. Ready for your next session?";
  } else {
    context = lang === "el" ? "🥊 Έτοιμος για προπόνηση?" : "🥊 Ready to train?";
  }

  return { greeting: `${word}, ${fn}!`, context };
}
