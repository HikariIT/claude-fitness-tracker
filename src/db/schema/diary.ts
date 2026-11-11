import { check, date, index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mealEnum } from "./enums";
import { foods } from "./foods";
import { timestamps } from "./shared";

// Nutrition columns are snapshots for the eaten quantity, computed when the entry is written,
// so later edits to a food do not change past days.
// Portion columns are a snapshot of the unit the user picked (name, grams per portion, count); null = grams.
export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    date: date({ mode: "string" }).notNull(),
    meal: mealEnum().notNull(),
    foodId: integer()
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    quantityG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    portionName: text(),
    portionG: numeric({ precision: 7, scale: 1, mode: "number" }),
    portionCount: numeric({ precision: 5, scale: 1, mode: "number" }),
    kcal: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    proteinG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    carbsG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    fatG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("diary_entries_date_meal_idx").on(t.date, t.meal),
    check("diary_entries_quantity_positive", sql`${t.quantityG} > 0`),
    check(
      "diary_entries_portion_all_or_none",
      sql`(${t.portionName} IS NULL AND ${t.portionG} IS NULL AND ${t.portionCount} IS NULL) OR (${t.portionName} IS NOT NULL AND ${t.portionG} IS NOT NULL AND ${t.portionCount} IS NOT NULL)`,
    ),
  ],
);
