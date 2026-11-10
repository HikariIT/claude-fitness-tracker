import { boolean, check, index, integer, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./shared";

// All nutrition values are per 100 g.
export const foods = pgTable(
  "foods",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    kcal: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    proteinG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    carbsG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    fatG: numeric({ precision: 7, scale: 2, mode: "number" }).notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    isComposite: boolean().notNull().default(false), // D1, fixed at creation (D8)
    finalWeightG: numeric({ precision: 7, scale: 1, mode: "number" }), // D2: dishes only; null = sum of ingredient grams
    ...timestamps,
  },
  (t) => [
    check(
      "foods_nutrition_non_negative",
      sql`${t.kcal} >= 0 AND ${t.proteinG} >= 0 AND ${t.carbsG} >= 0 AND ${t.fatG} >= 0`,
    ),
    check("foods_final_weight_positive", sql`${t.finalWeightG} IS NULL OR ${t.finalWeightG} > 0`),
  ],
);

// Ingredients of a dish (foods.isComposite = true). quantityG = grams of the component in the whole dish.
export const foodComponents = pgTable(
  "food_components",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    foodId: integer()
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    componentFoodId: integer()
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }), // D5
    quantityG: numeric({ precision: 7, scale: 1, mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique("food_components_food_component_unique").on(t.foodId, t.componentFoodId),
    index("food_components_component_food_id_idx").on(t.componentFoodId),
    check("food_components_quantity_positive", sql`${t.quantityG} > 0`),
    check("food_components_not_self", sql`${t.foodId} <> ${t.componentFoodId}`),
  ],
);
