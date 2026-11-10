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
