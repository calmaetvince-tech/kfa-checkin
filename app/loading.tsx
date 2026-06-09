export default function Loading() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="h-10 w-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="text-sm text-neutral-500">Loading…</p>
    </main>
  );
}
