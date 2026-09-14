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
