// Achievement badge wall — earned bright, the rest locked as goals.

const BADGES = [
  { key: "first_blood", icon: "🥊", el: "Πρώτο μάθημα", en: "First session" },
  { key: "early_bird", icon: "🌅", el: "Πρωινός", en: "Early bird" },
  { key: "night_owl", icon: "🌙", el: "Νυχτερινός", en: "Night owl" },
  { key: "ten_month", icon: "💯", el: "10 σε 1 μήνα", en: "10 in a month" },
  { key: "week_streak", icon: "⚔️", el: "7 μέρες σερί", en: "7-day streak" },
  { key: "fifty_club", icon: "🏋️", el: "Club των 50", en: "50 club" },
];

export function BadgesCard({
  earned,
  lang,
}: {
  earned: string[];
  lang: "el" | "en";
}) {
  const set = new Set(earned);
  const count = BADGES.filter((b) => set.has(b.key)).length;

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title font-display text-xl tracking-wide">
          {lang === "el" ? "Παράσημα" : "Badges"}
        </h2>
        <span className="text-xs text-neutral-500">
          {count}/{BADGES.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const has = set.has(b.key);
          return (
            <div
              key={b.key}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center ${
                has
                  ? "bg-brand/12 border border-brand/35"
                  : "bg-neutral-900/50 border border-neutral-800 opacity-45"
              }`}
            >
              <span className={`text-2xl ${has ? "" : "grayscale"}`}>
                {has ? b.icon : "🔒"}
              </span>
              <span
                className={`text-[10px] leading-tight ${
                  has ? "text-brand font-semibold" : "text-neutral-500"
                }`}
              >
                {lang === "el" ? b.el : b.en}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
