import {
  waReminderHref,
  waInactiveHref,
  waBirthdayHref,
  type Lang,
} from "@/lib/whatsapp";

type Variant = "renewal" | "inactive" | "birthday";

const LABELS: Record<Variant, string> = {
  renewal: "💬 Remind on WhatsApp",
  inactive: "💬 Message",
  birthday: "🎂 Wish",
};

// One-tap WhatsApp message to a member. Renders an enabled link when the member
// has a phone, otherwise a disabled button with a hint tooltip.
//   variant 'renewal'  → renewal reminder (requires expiresAt)
//   variant 'inactive' → "we miss you" nudge
//   variant 'birthday' → birthday wish
export function WhatsAppReminderButton({
  name,
  phone,
  expiresAt,
  variant = "renewal",
  lang = "el",
  className = "",
}: {
  name: string;
  phone: string | null | undefined;
  expiresAt?: string | null;
  variant?: Variant;
  lang?: Lang;
  className?: string;
}) {
  const label = LABELS[variant];
  const base =
    "btn-ghost text-xs py-1.5 px-2.5 whitespace-nowrap " + className;

  if (!phone || !phone.trim()) {
    return (
      <button
        type="button"
        disabled
        title="Add a phone number first"
        className={`${base} opacity-50 cursor-not-allowed`}
      >
        {label}
      </button>
    );
  }

  const href =
    variant === "inactive"
      ? waInactiveHref(name, phone, lang)
      : variant === "birthday"
      ? waBirthdayHref(name, phone, lang)
      : waReminderHref(name, phone, expiresAt ?? "");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={base}
    >
      {label}
    </a>
  );
}
