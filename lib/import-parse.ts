// Parser for the bulk member import. Kept free of React and of any Supabase
// import so the exact same code validates the paste in the browser preview and
// again on the server — the preview can never promise something the import
// then rejects.

export type ParsedRow = {
  line: number;
  name: string;
  phone: string | null;
  email: string | null;
  /** Subscription start, YYYY-MM-DD. Null means "starts today". */
  startDate: string | null;
  months: number;
  plan: string;
  discipline: string | null;
  errors: string[];
  /** Same name (case/space-insensitive) appears earlier in this paste. */
  duplicateOf: number | null;
};

export type ParseResult = {
  rows: ParsedRow[];
  headerSkipped: boolean;
  delimiter: "tab" | "comma" | "semicolon";
};

const PLAN_BY_MONTHS: Record<number, string> = {
  0: "Drop-in",
  1: "Monthly",
  3: "Quarterly",
  6: "6-month",
  12: "Annual",
};

export function planForMonths(months: number): string {
  return PLAN_BY_MONTHS[months] ?? "Custom";
}

/** Greek phone-ish: keep digits, +, spaces. Reject anything with letters. */
function normalizePhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^[+\d][\d\s().-]*$/.test(v)) return null;
  return v.replace(/[\s().-]/g, "");
}

function isEmail(v: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
}

/**
 * Dates as a Greek gym owner writes them. DD/MM/YYYY is assumed — never
 * MM/DD — because 3/4/2026 means 3 April here, and silently reading it as
 * 4 March would set every affected subscription to expire a month early.
 * ISO (YYYY-MM-DD) is detected by shape and read as ISO.
 */
export function parseDate(raw: string): { iso: string | null; error?: string } {
  const v = raw.trim();
  if (!v) return { iso: null };

  let y: number, m: number, d: number;

  const iso = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmy = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);

  if (iso) {
    y = +iso[1];
    m = +iso[2];
    d = +iso[3];
  } else if (dmy) {
    d = +dmy[1];
    m = +dmy[2];
    y = +dmy[3];
    if (y < 100) y += 2000; // 26 -> 2026
  } else {
    return { iso: null, error: `δεν κατάλαβα την ημερομηνία "${v}"` };
  }

  if (m < 1 || m > 12) return { iso: null, error: `άκυρος μήνας στο "${v}"` };
  if (d < 1 || d > 31) return { iso: null, error: `άκυρη μέρα στο "${v}"` };

  // Reject real-calendar impossibilities like 31/02.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return { iso: null, error: `δεν υπάρχει η ημερομηνία "${v}"` };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return { iso: `${y}-${pad(m)}-${pad(d)}` };
}

/**
 * Subscription window. Anchored at 12:00 UTC so that neither the server's UTC
 * clock nor Athens (UTC+2/+3) can shift the stored day across a boundary.
 */
export function subscriptionWindow(
  startISO: string | null,
  months: number
): { renewedAt: string | null; expiresAt: string | null } {
  if (months <= 0) return { renewedAt: null, expiresAt: null };

  const start = startISO
    ? (() => {
        const [y, m, d] = startISO.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d, 12));
      })()
    : (() => {
        const n = new Date();
        return new Date(
          Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12)
        );
      })();

  return {
    renewedAt: start.toISOString(),
    expiresAt: addMonthsClamped(start, months).toISOString(),
  };
}

/**
 * Add whole months, clamping to the end of the target month.
 *
 * Plain setMonth(+1) on 31 January overflows into 3 March, silently handing
 * the member three free days — and the same happens for every 29th/30th/31st.
 * Used by new members, the bulk import and renewals so all three agree.
 */
export function addMonthsClamped(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const out = new Date(from);
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const lastDayOfTarget = new Date(
    Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)
  ).getUTCDate();
  out.setUTCDate(Math.min(day, lastDayOfTarget));
  return out;
}

function detectDelimiter(text: string): ParseResult["delimiter"] {
  if (text.includes("\t")) return "tab";
  const commas = (text.match(/,/g) ?? []).length;
  const semis = (text.match(/;/g) ?? []).length;
  return semis > commas ? "semicolon" : "comma";
}

const HEADER_WORDS = /name|όνομα|ονομα|phone|τηλ|email|start|έναρξη|εναρξη|μήνες|μηνες|month/i;

/**
 * Columns, in order: name, phone, start date, months, program, email.
 * Only the name is required; everything after it may be blank or absent.
 */
export function parseMembersInput(text: string): ParseResult {
  const delimiter = detectDelimiter(text);
  const splitChar = delimiter === "tab" ? "\t" : delimiter === "comma" ? "," : ";";

  const lines = text.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let headerSkipped = false;
  const seen = new Map<string, number>();

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    if (!rawLine.trim()) return;

    const cells = rawLine.split(splitChar).map((c) => c.trim());

    // A first row that names the columns is a header, not a member.
    if (
      rows.length === 0 &&
      !headerSkipped &&
      HEADER_WORDS.test(cells[0] ?? "") &&
      !/\d/.test(cells[0] ?? "")
    ) {
      headerSkipped = true;
      return;
    }

    const errors: string[] = [];
    const name = (cells[0] ?? "").replace(/\s+/g, " ").trim();
    if (!name) errors.push("λείπει το όνομα");

    const phone = normalizePhone(cells[1] ?? "");
    if ((cells[1] ?? "").trim() && !phone) {
      errors.push(`το τηλέφωνο "${cells[1]}" δεν μοιάζει σωστό`);
    }

    const { iso: startDate, error: dateErr } = parseDate(cells[2] ?? "");
    if (dateErr) errors.push(dateErr);

    const monthsCell = (cells[3] ?? "").trim();
    let months = 1;
    if (monthsCell) {
      const n = Number(monthsCell.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 24) {
        errors.push(`οι μήνες "${monthsCell}" πρέπει να είναι 0–24`);
      } else {
        months = Math.round(n);
      }
    }

    const discipline = (cells[4] ?? "").trim() || null;

    const emailCell = (cells[5] ?? "").trim();
    let email: string | null = null;
    if (emailCell) {
      if (isEmail(emailCell)) email = emailCell;
      else errors.push(`το email "${emailCell}" δεν μοιάζει σωστό`);
    }

    const key = name.toLowerCase();
    const duplicateOf = name && seen.has(key) ? seen.get(key)! : null;
    if (name && !seen.has(key)) seen.set(key, lineNo);

    rows.push({
      line: lineNo,
      name,
      phone,
      email,
      startDate,
      months,
      plan: planForMonths(months),
      discipline,
      errors,
      duplicateOf,
    });
  });

  return { rows, headerSkipped, delimiter };
}
