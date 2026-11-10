import { check, date, integer, numeric, pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { activityLevelEnum, sexEnum } from "./enums";
import { timestamps } from "./shared";

// Single-row table: the row always has id = 1.
export const settings = pgTable(
  "settings",
  {
    id: integer().primaryKey().default(1),
    sex: sexEnum().notNull(),
    birthDate: date({ mode: "string" }).notNull(),
    heightCm: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
    weightKg: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
    activityLevel: activityLevelEnum().notNull(),
    kcalGoal: integer().notNull(),
    proteinGoalG: integer(),
    ...timestamps,
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);
