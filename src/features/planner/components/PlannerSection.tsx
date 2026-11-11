import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isIsoDate, localIsoDate } from "@/lib/dates";
import { getDiaryDay } from "@/server/dal/diary";
import { listFoods } from "@/server/dal/foods";
import { getSettings } from "@/server/dal/settings";
import { PlannerView } from "./PlannerView";

/** `dateParam` undefined = today. Reads per request, so the DB reads stay out of the build-time prerender. */
export async function PlannerSection({ dateParam }: { dateParam?: Promise<string> }) {
  await connection();
  const date = dateParam ? await dateParam : localIsoDate(new Date());
  if (!isIsoDate(date)) notFound(); // D2

  const [entries, foods, settings] = await Promise.all([
    getDiaryDay(date),
    listFoods(),
    getSettings(),
  ]);
  return (
    <PlannerView
      date={date}
      entries={entries}
      foods={foods}
      goals={settings ? { kcal: settings.kcalGoal, proteinG: settings.proteinGoalG } : null}
    />
  );
}
