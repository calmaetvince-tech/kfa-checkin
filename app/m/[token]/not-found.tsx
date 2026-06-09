export default function NotFound() {
  return (
    <main className="flex flex-col gap-4 pt-12 text-center">
      <h1 className="text-2xl font-bold">Link not found</h1>
      <p className="text-neutral-500 text-sm">
        This member link doesn&apos;t exist or has been removed. Ask the gym
        owner for a new one.
      </p>
    </main>
  );
}
