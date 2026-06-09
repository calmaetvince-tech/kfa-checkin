"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <Logo size="lg" />
      <div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-400 max-w-sm">
          An unexpected error occurred. Try again — if it keeps happening, let
          the gym know.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-neutral-600">Ref: {error.digest}</p>
        )}
      </div>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </main>
  );
}
