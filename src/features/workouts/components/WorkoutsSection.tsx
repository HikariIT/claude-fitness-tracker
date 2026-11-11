import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isIsoDate, localIsoDate } from "@/lib/dates";
import { getDailySteps, getWorkoutDay, listExercises } from "@/server/dal/workouts";
import { getSettings } from "@/server/dal/settings";
import { WorkoutsView } from "./WorkoutsView";

/** `dateParam` undefined = today. Reads per request, so the DB reads stay out of the build-time prerender. */
export async function WorkoutsSection({ dateParam }: { dateParam?: Promise<string> }) {
  await connection();
  const date = dateParam ? await dateParam : localIsoDate(new Date());
  if (!isIsoDate(date)) notFound(); // D1

  const [workouts, steps, exercises, settings] = await Promise.all([
    getWorkoutDay(date),
    getDailySteps(date),
    listExercises(),
    getSettings(),
  ]);
  return (
    <WorkoutsView
      date={date}
      workouts={workouts}
      steps={steps}
      exercises={exercises}
      weightKg={settings?.weightKg ?? null}
    />
  );
}
