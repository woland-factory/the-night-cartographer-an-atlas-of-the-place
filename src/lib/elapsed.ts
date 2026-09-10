// Human elapsed time between two dates. Used for the recall readout line
// "Last visit here: 14 months ago". The label is computed at runtime, never
// hardcoded.
//
// Inputs are date strings (YYYY-MM-DD) or ISO timestamps. The comparison is
// by calendar day, so "yesterday" means the previous calendar day.

function startOfDay(value: string): Date {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarMonths(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

export function elapsedLabel(fromISO: string, nowISO: string): string {
  const from = startOfDay(fromISO);
  const now = startOfDay(nowISO);

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((now.getTime() - from.getTime()) / msPerDay);

  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.max(1, calendarMonths(from, now));
  if (months < 24) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
