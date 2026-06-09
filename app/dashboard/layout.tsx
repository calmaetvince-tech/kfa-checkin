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
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-bold text-brand">KFA</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline text-neutral-500">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <nav className="grid grid-cols-3 gap-2">
        <Link href="/dashboard/scan" className="btn-primary text-center">
          📷 Scan
        </Link>
        <Link href="/dashboard" className="btn-ghost text-center">
          Members
        </Link>
        <Link href="/dashboard/add" className="btn-ghost text-center">
          + Add
        </Link>
      </nav>

      <main>{children}</main>
    </div>
  );
}
