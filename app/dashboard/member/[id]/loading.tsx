// Skeleton shaped like the member page (title, QR card, stat rows) so the
// screen does not jump when the real data lands.
export default function MemberLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Φόρτωση μέλους">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-40 animate-pulse rounded bg-neutral-900" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-900" />
      </div>
      <div className="card flex flex-col items-center gap-3">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-900 self-start" />
        <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-neutral-900" />
        <div className="h-8 w-full animate-pulse rounded bg-neutral-900" />
      </div>
      <div className="h-28 animate-pulse rounded-2xl bg-neutral-900" />
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-900" />
    </div>
  );
}
