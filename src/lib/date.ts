// The composer's default date and the date input's `max`. Built from the
// LOCAL year/month/day, never `toISOString()`, so a dream written late at
// night is dated the user's calendar today, not tomorrow in UTC.
//
// Deterministic given its `now` argument: the call site passes `new Date()`,
// the helper takes it so it stays unit-testable.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function todayLocalISO(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format a YYYY-MM-DD dream date for display ("2 November 2019") without
// touching timezones: split the string, never `new Date(date)`.
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
