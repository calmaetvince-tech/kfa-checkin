import { requireOwner } from "@/lib/auth";
import { addClass, deleteClass } from "./actions";

export const dynamic = "force-dynamic";

const DAYS = [
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
  "Κυριακή",
];

type Row = { id: string; dow: number; start_time: string; title: string };

export default async function SchedulePage() {
  const { supabase } = await requireOwner();

  const { data } = await supabase
    .from("class_schedule")
    .select("id, dow, start_time, title")
    .order("dow")
    .order("start_time")
    .returns<Row[]>();

  const rows = data ?? [];
  const byDay = DAYS.map((label, i) => ({
    label,
    classes: rows.filter((r) => r.dow === i),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="section-title font-display text-2xl tracking-wide">
        📅 Πρόγραμμα μαθημάτων
      </h1>
      <p className="text-sm text-neutral-500 -mt-2">
        Ό,τι προσθέτεις εδώ το βλέπουν όλα τα μέλη στη σελίδα τους.
      </p>

      {/* add class */}
      <form action={addClass} className="card flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="dow" className="text-xs text-neutral-500 block mb-1">
              Ημέρα
            </label>
            <select id="dow" name="dow" className="input">
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="start_time"
              className="text-xs text-neutral-500 block mb-1"
            >
              Ώρα
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              required
              defaultValue="19:00"
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="title" className="text-xs text-neutral-500 block mb-1">
            Μάθημα
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="Muay Thai — Ενήλικες"
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary">
          + Προσθήκη
        </button>
      </form>

      {/* week view */}
      {byDay.map(
        (d) =>
          d.classes.length > 0 && (
            <section key={d.label} className="card flex flex-col gap-1">
              <h2 className="section-title font-display text-lg tracking-wide">
                {d.label}
              </h2>
              <ul className="divide-y divide-neutral-800">
                {d.classes.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 gap-2"
                  >
                    <span className="font-display text-lg text-brand w-14 shrink-0">
                      {c.start_time}
                    </span>
                    <span className="flex-1 truncate">{c.title}</span>
                    <form action={deleteClass}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        aria-label="Διαγραφή"
                        className="text-neutral-600 hover:text-rose-400 px-2"
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )
      )}

      {rows.length === 0 && (
        <div className="card text-sm text-neutral-500">
          Δεν υπάρχουν μαθήματα ακόμα — πρόσθεσε το πρώτο πιο πάνω.
        </div>
      )}
    </div>
  );
}
