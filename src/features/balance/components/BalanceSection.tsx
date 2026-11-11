import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isIsoDate, localIsoDate, weekDays } from "@/lib/dates";
import { dayBalance, weekBalance, type BalanceProfile } from "@/lib/balance";
import { getDiaryDay } from "@/server/dal/diary";
import { getDailySteps, getWorkoutDay } from "@/server/dal/workouts";
import { getSettings } from "@/server/dal/settings";
import { BalanceView } from "./BalanceView";

/** `dateParam` undefined = today. Reads per request, so the DB reads stay out of the build-time prerender. */
export async function BalanceSection({ dateParam }: { dateParam?: Promise<string> }) {
  await connection();
  const date = dateParam ? await dateParam : localIsoDate(new Date());
  if (!isIsoDate(date)) notFound(); // D5

  const settings = await getSettings();
  if (!settings) return <BalanceView date={date} week={null} />; // D7

  const profile: BalanceProfile = {
    sex: settings.sex,
    birthDate: settings.birthDate,
    heightCm: settings.heightCm,
    weightKg: settings.weightKg,
  };
  // D8: reuse the per-day DAL reads (and their tags) for all 7 days in parallel.
  const days = await Promise.all(
    weekDays(date).map(async (d) => {
      const [diary, workouts, steps] = await Promise.all([getDiaryDay(d), getWorkoutDay(d), getDailySteps(d)]);
      return dayBalance({ date: d, profile, diary, workouts, steps });
    }),
  );
  return <BalanceView date={date} week={{ days, total: weekBalance(days) }} />;
}
