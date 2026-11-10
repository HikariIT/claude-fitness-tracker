const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Parses a decimal with a comma or dot separator and rounds it to 1 decimal. Returns null if not numeric. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!DECIMAL.test(normalized)) return null;
  return Math.round(Number(normalized) * 10) / 10;
}
