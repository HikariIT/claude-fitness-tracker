/** D6 limits. */
export const PORTION_MAX = 10;
export const PORTION_NAME_MAX = 30;
export const PORTION_GRAMS_MIN = 0.1;
export const PORTION_GRAMS_MAX = 5000;
export const PORTION_COUNT_MIN = 0.1;
export const PORTION_COUNT_MAX = 100;
/** Range of the resulting grams, same as a grams entry. */
export const QUANTITY_G_MIN = 0.1;
export const QUANTITY_G_MAX = 5000;

/** What the user typed: grams, or a count of one of the food's portions (by food_portions id). */
export type PortionAmount =
  | { kind: "grams"; quantityG: number }
  | { kind: "portion"; portionId: number; count: number };

/** Snapshot stored on diary entries and dish ingredients (D4, D5). All null = grams. */
export type PortionSnapshot =
  | { portionName: string; portionG: number; portionCount: number }
  | { portionName: null; portionG: null; portionCount: null };
export const NO_PORTION_SNAPSHOT = { portionName: null, portionG: null, portionCount: null } as const;

/** D15: count × grams per portion, rounded to 0.1 g. */
export function portionGrams(count: number, grams: number): number {
  return Math.round(count * grams * 10) / 10;
}

/** D7: the food's first portion by sortOrder, or null when it has none. */
export function defaultPortion<T extends { sortOrder: number }>(portions: readonly T[]): T | null {
  let first: T | null = null;
  for (const portion of portions) {
    if (first === null || portion.sortOrder < first.sortOrder) first = portion;
  }
  return first;
}

/** A portion whose name matches (trimmed, case-insensitive with the "pl" locale), or null. `name` null → null. Used to reopen a saved unit (D7). */
export function findPortionByName<T extends { name: string }>(
  portions: readonly T[],
  name: string | null,
): T | null {
  if (name === null) return null;
  const wanted = name.trim().toLocaleLowerCase("pl");
  return portions.find((portion) => portion.name.trim().toLocaleLowerCase("pl") === wanted) ?? null;
}
