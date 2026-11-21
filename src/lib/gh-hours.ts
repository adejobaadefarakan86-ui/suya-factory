// Gloria's pickup hours in Accra (GMT all year, no daylight saving).
//   Mon–Fri 8am – 9pm · Sat 9am – 9pm · Sunday closed.
// Used to tell customers when their rider can come. (The text shown to riders
// is edited at /admin/delivery; keep both in step if the hours change.)

/** [opens, closes] in 24h hours, by day (0 = Sunday). null = closed. */
const HOURS: ([number, number] | null)[] = [null, [8, 21], [8, 21], [8, 21], [8, 21], [8, 21], [9, 21]];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const GH_HOURS_TEXT = "Mon–Fri 8am – 9pm · Sat 9am – 9pm · Closed on Sunday";

const ampm = (h: number) => (h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`);

/** Is pickup open now? If not, when does it next open ("Monday at 8am", "today at 9am")? */
export function ghPickupStatus(now: Date = new Date()): { open: true } | { open: false; opens: string } {
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const today = HOURS[day];
  if (today && hour >= today[0] && hour < today[1]) return { open: true };
  if (today && hour < today[0]) return { open: false, opens: `today at ${ampm(today[0])}` };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const h = HOURS[d];
    if (h) return { open: false, opens: `${i === 1 ? "tomorrow" : DAYS[d]} at ${ampm(h[0])}` };
  }
  return { open: false, opens: "soon" };
}
