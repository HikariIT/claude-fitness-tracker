import { pgEnum } from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack", "other"]);
export const workoutTypeEnum = pgEnum("workout_type", ["treadmill", "training"]);
