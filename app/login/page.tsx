import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errMap: Record<string, string> = {
    not_admin: "That account isn't an owner. Ask the gym owner to grant access.",
    invalid: "Invalid email or password.",
  };
  const message = searchParams.error ? errMap[searchParams.error] : null;

  return (
    <main className="flex flex-col gap-6 pt-8">
      <header className="flex flex-col items-center gap-2">
        <Logo size="lg" />
        <h1 className="text-2xl font-bold">Owner sign in</h1>
        <p className="text-sm text-neutral-400 text-center">
          Use the email and password set up in Supabase Auth.
        </p>
      </header>
      {message && (
        <div className="badge-bad rounded-lg p-3 text-sm">{message}</div>
      )}
      <LoginForm />
    </main>
  );
}
