const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

export function isIsoDate(value: string): boolean {
  return parseIso(value) !== null;
}

export function isoToUtcDate(iso: string): Date {
  const parts = parseIso(iso);
  if (!parts) throw new RangeError(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
}

export function addDays(iso: string, days: number): string {
  const date = isoToUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** D5: the Monday of the ISO week containing `iso` ("YYYY-MM-DD"). Monday maps to itself, Sunday to the Monday 6 days earlier. */
export function weekStart(iso: string): string {
  const offset = (isoToUtcDate(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -offset);
}

/** D5: the 7 dates Monday..Sunday of the week containing `iso`. */
export function weekDays(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The local calendar date of `now` as "YYYY-MM-DD" (D2). Uses getFullYear/getMonth/getDate, not UTC. */
export function localIsoDate(now: Date): string {
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
