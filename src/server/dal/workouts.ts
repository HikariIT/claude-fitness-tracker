import "server-only";
import { cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailySteps, exercises, treadmillSessions, workoutSets, workouts } from "@/db/schema";

export type Workout = typeof workouts.$inferSelect;
export type TreadmillSession = typeof treadmillSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type DailySteps = typeof dailySteps.$inferSelect;
export type WorkoutDetails = Workout & {
  treadmillSession: TreadmillSession | null;
  sets: WorkoutSet[];
};

/** D2: the day's workouts by ascending id, sets by `order`. Tag `workouts:<date>`. Exercise names are joined in the UI. */
export async function getWorkoutDay(date: string): Promise<WorkoutDetails[]> {
  "use cache";
  cacheTag(`workouts:${date}`);
  return db.query.workouts.findMany({
    where: (w, { eq }) => eq(w.date, date),
    orderBy: (w, { asc }) => [asc(w.id)],
    with: {
      treadmillSession: true,
      sets: { orderBy: (s, { asc }) => [asc(s.order)] },
    },
  });
}

/** Tag `workouts:<date>`. null when nothing has been saved for that day. */
export async function getDailySteps(date: string): Promise<DailySteps | null> {
  "use cache";
  cacheTag(`workouts:${date}`);
  const [row] = await db.select().from(dailySteps).where(eq(dailySteps.date, date)).limit(1);
  return row ?? null;
}

/** All exercises, including archived ones, ordered by name. Tag `exercises`. */
export async function listExercises(): Promise<Exercise[]> {
  "use cache";
  cacheTag("exercises");
  return db.select().from(exercises).orderBy(asc(exercises.name));
}
