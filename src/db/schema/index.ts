import { relations } from "drizzle-orm";
import { diaryEntries } from "./diary";
import { foods } from "./foods";
import { exercises, treadmillSessions, workoutSets, workouts } from "./workouts";

export * from "./enums";
export * from "./settings";
export * from "./foods";
export * from "./diary";
export * from "./workouts";

export const foodsRelations = relations(foods, ({ many }) => ({
  diaryEntries: many(diaryEntries),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  food: one(foods, { fields: [diaryEntries.foodId], references: [foods.id] }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  treadmillSession: one(treadmillSessions),
  sets: many(workoutSets),
}));

export const treadmillSessionsRelations = relations(treadmillSessions, ({ one }) => ({
  workout: one(workouts, { fields: [treadmillSessions.workoutId], references: [workouts.id] }),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  sets: many(workoutSets),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] }),
}));
