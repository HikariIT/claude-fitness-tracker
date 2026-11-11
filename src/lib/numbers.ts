const DECIMAL = /^-?\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

/**
 * Parses a decimal with a comma or dot separator and rounds it to `places` decimals (default 1).
 * Returns null if not numeric.
 */
export function parseDecimal(raw: string, places = 1): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!DECIMAL.test(normalized)) return null;
  const factor = 10 ** places;
  return Math.round(Number(normalized) * factor) / factor;
}

/** Parses a non-negative whole number ("12", " 7 "). Returns null for decimals, signs or text. */
export function parseInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!INTEGER.test(trimmed)) return null;
  return Number(trimmed);
}
