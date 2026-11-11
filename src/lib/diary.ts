/** Must match mealEnum in src/db/schema/enums.ts; this order is the display order (D5). */
export const MEALS = ["breakfast", "lunch", "dinner", "snack", "other"] as const;
export type Meal = (typeof MEALS)[number];

export function isMeal(value: string): value is Meal {
  return (MEALS as readonly string[]).includes(value);
}

export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Snapshot for `quantityG` grams of a food whose values are per 100 g (D3). Each value is rounded to 2 decimals. */
export function portionNutrition(per100: Nutrition, quantityG: number): Nutrition {
  const factor = quantityG / 100;
  return {
    kcal: round2(per100.kcal * factor),
    proteinG: round2(per100.proteinG * factor),
    carbsG: round2(per100.carbsG * factor),
    fatG: round2(per100.fatG * factor),
  };
}

/** Sum of rows (D6). Each value is rounded to 2 decimals. Empty → all zeros. */
export function sumNutrition(rows: readonly Nutrition[]): Nutrition {
  const total = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const row of rows) {
    total.kcal += row.kcal;
    total.proteinG += row.proteinG;
    total.carbsG += row.carbsG;
    total.fatG += row.fatG;
  }
  return {
    kcal: round2(total.kcal),
    proteinG: round2(total.proteinG),
    carbsG: round2(total.carbsG),
    fatG: round2(total.fatG),
  };
}

/** Groups entries by meal in MEALS order, skipping empty meals (D5). Entries in a group keep ascending `id` order (D13). */
export function groupByMeal<T extends { id: number; meal: Meal }>(
  entries: readonly T[],
): { meal: Meal; entries: T[] }[] {
  const sorted = [...entries].sort((a, b) => a.id - b.id);
  return MEALS.flatMap((meal) => {
    const group = sorted.filter((entry) => entry.meal === meal);
    return group.length > 0 ? [{ meal, entries: group }] : [];
  });
}

/** Meal of the entry with the highest id, or "breakfast" when there are none (D5). */
export function defaultMeal(entries: readonly { id: number; meal: Meal }[]): Meal {
  let latest: { id: number; meal: Meal } | null = null;
  for (const entry of entries) {
    if (latest === null || entry.id > latest.id) latest = entry;
  }
  return latest ? latest.meal : "breakfast";
}
