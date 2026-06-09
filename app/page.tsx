import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MemberRedirect } from "@/components/MemberRedirect";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <MemberRedirect />
      <main className="flex flex-col gap-6 pt-8">
        <header className="text-center flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-neutral-400 text-sm">
            QR check-in for members
          </p>
        </header>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Gym owner</h2>
          <p className="text-sm text-neutral-400">
            Sign in to scan QR codes, add members, and view stats.
          </p>
          <Link href="/login" className="btn-primary">
            Owner sign in
          </Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-neutral-400">
            Ask the gym owner to add you. You&apos;ll get a personal link with
            your QR code — add it to your phone&apos;s home screen and show it
            at the front desk.
          </p>
        </div>
      </main>
    </Suspense>
  );
}
