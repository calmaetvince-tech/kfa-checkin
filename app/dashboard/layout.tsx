import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireOwner();

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* top bar: identity only — actions live in the thumb bar */}
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-bold text-brand tracking-wide">KFA</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline text-neutral-500">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main>{children}</main>

      {/* bottom thumb bar — Scan is the hero action */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-2xl px-8 py-2.5 grid grid-cols-3 items-center">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-100 py-1"
          >
            <span aria-hidden className="text-xl leading-none">🏠</span>
            <span className="text-[11px]">Home</span>
          </Link>

          <Link
            href="/dashboard/scan"
            className="justify-self-center -mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg shadow-brand/25 ring-4 ring-neutral-950 active:scale-95 transition"
          >
            <span aria-hidden className="text-2xl leading-none">📷</span>
            <span className="text-[10px] font-bold">Scan</span>
          </Link>

          <Link
            href="/dashboard/add"
            className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-100 py-1"
          >
            <span aria-hidden className="text-xl leading-none">＋</span>
            <span className="text-[11px]">Add</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
