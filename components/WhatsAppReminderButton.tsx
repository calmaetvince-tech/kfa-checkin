import { waReminderHref } from "@/lib/whatsapp";

// One-tap WhatsApp renewal reminder. Renders an enabled link when the member
// has a phone, otherwise a disabled button with a hint tooltip.
export function WhatsAppReminderButton({
  name,
  phone,
  expiresAt,
  className = "",
}: {
  name: string;
  phone: string | null | undefined;
  expiresAt: string;
  className?: string;
}) {
  const label = "💬 Remind on WhatsApp";
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

  return (
    <a
      href={waReminderHref(name, phone, expiresAt)}
      target="_blank"
      rel="noopener noreferrer"
      className={base}
    >
      {label}
    </a>
  );
}
