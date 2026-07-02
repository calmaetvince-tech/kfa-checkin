// Fighter rank progression — earned with total check-ins. The retention hook:
// every scan moves the bar toward the next rank.

export type Rank = {
  key: string;
  en: string;
  el: string;
  icon: string;
  min: number;
};

export const RANKS: Rank[] = [
  { key: "rookie", en: "ROOKIE", el: "ΑΡΧΑΡΙΟΣ", icon: "🥊", min: 0 },
  { key: "contender", en: "CONTENDER", el: "ΔΙΕΚΔΙΚΗΤΗΣ", icon: "⚡", min: 10 },
  { key: "warrior", en: "WARRIOR", el: "ΠΟΛΕΜΙΣΤΗΣ", icon: "⚔️", min: 25 },
  { key: "veteran", en: "VETERAN", el: "ΒΕΤΕΡΑΝΟΣ", icon: "🛡️", min: 50 },
  { key: "champion", en: "CHAMPION", el: "ΠΡΩΤΑΘΛΗΤΗΣ", icon: "🏆", min: 100 },
  { key: "legend", en: "LEGEND", el: "ΘΡΥΛΟΣ", icon: "👑", min: 200 },
];

export function rankFor(totalVisits: number): {
  rank: Rank;
  next: Rank | null;
  progress: number; // 0..1 toward next rank
  remaining: number; // visits until next rank
} {
  let rank = RANKS[0];
  for (const r of RANKS) if (totalVisits >= r.min) rank = r;
  const idx = RANKS.indexOf(rank);
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  if (!next) return { rank, next: null, progress: 1, remaining: 0 };
  const span = next.min - rank.min;
  const into = totalVisits - rank.min;
  return {
    rank,
    next,
    progress: Math.min(1, into / span),
    remaining: next.min - totalVisits,
  };
}
