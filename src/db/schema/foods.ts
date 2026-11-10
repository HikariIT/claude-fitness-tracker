import { check, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
    ...timestamps,
  },
  (t) => [
    check(
      "foods_nutrition_non_negative",
      sql`${t.kcal} >= 0 AND ${t.proteinG} >= 0 AND ${t.carbsG} >= 0 AND ${t.fatG} >= 0`,
    ),
  ],
);
