import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workoutTypeEnum } from "./enums";
import { timestamps } from "./shared";

export const workouts = pgTable(
  "workouts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: workoutTypeEnum().notNull(),
    date: date({ mode: "string" }).notNull(),
    name: text(),
    notes: text(),
    kcalBurned: integer(),
    ...timestamps,
  },
  (t) => [index("workouts_date_idx").on(t.date)],
);

// 1:1 with a treadmill workout. A service enforces the type rule (not the DB).
export const treadmillSessions = pgTable(
  "treadmill_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    workoutId: integer()
      .notNull()
      .unique()
      .references(() => workouts.id, { onDelete: "cascade" }),
    durationMin: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
    speedKmh: numeric({ precision: 4, scale: 1, mode: "number" }).notNull(),
    inclinePct: numeric({ precision: 4, scale: 1, mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    check("treadmill_duration_positive", sql`${t.durationMin} > 0`),
    check("treadmill_speed_positive", sql`${t.speedKmh} > 0`),
    check("treadmill_incline_non_negative", sql`${t.inclinePct} >= 0`),
  ],
);

export const exercises = pgTable("exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
  archivedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    workoutId: integer()
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer()
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    order: integer().notNull(),
    reps: integer().notNull(),
    weightKg: numeric({ precision: 6, scale: 2, mode: "number" }),
    ...timestamps,
  },
  (t) => [
    index("workout_sets_workout_id_idx").on(t.workoutId),
    check("workout_sets_reps_positive", sql`${t.reps} > 0`),
  ],
);

// One row per day (D7). kcal is stored as entered (prefilled from an estimate in the UI).
export const dailySteps = pgTable(
  "daily_steps",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    date: date({ mode: "string" }).notNull().unique(),
    steps: integer().notNull(),
    kcal: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    check("daily_steps_steps_non_negative", sql`${t.steps} >= 0`),
    check("daily_steps_kcal_non_negative", sql`${t.kcal} >= 0`),
  ],
);
