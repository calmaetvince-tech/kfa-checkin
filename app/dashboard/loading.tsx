// Every dashboard page is force-dynamic, so a tap has to wait for a server
// round-trip. Without a loading boundary Next.js shows nothing at all in the
// meantime — the button looks stuck — and it also cannot prefetch a dynamic
// route. This gives instant feedback and makes the links prefetchable.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Φόρτωση">
      <div className="h-24 animate-pulse rounded-2xl bg-neutral-900" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-900" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-900" />
    </div>
  );
}
