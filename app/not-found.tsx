import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <Logo size="lg" />
      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-400 max-w-sm">
          This page doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </main>
  );
}
