import { relations } from "drizzle-orm";
import { diaryEntries } from "./diary";
import { foodComponents, foodPortions, foods } from "./foods";
import { exercises, treadmillSessions, workoutSets, workouts } from "./workouts";

export * from "./enums";
export * from "./settings";
export * from "./foods";
export * from "./diary";
export * from "./workouts";

export const foodsRelations = relations(foods, ({ many }) => ({
  diaryEntries: many(diaryEntries),
  components: many(foodComponents, { relationName: "composite" }), // ingredients of this dish
  usedIn: many(foodComponents, { relationName: "component" }), // rows where this food is an ingredient
  portions: many(foodPortions),
}));

export const foodPortionsRelations = relations(foodPortions, ({ one }) => ({
  food: one(foods, { fields: [foodPortions.foodId], references: [foods.id] }),
}));

export const foodComponentsRelations = relations(foodComponents, ({ one }) => ({
  food: one(foods, {
    fields: [foodComponents.foodId],
    references: [foods.id],
    relationName: "composite",
  }),
  component: one(foods, {
    fields: [foodComponents.componentFoodId],
    references: [foods.id],
    relationName: "component",
  }),
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
