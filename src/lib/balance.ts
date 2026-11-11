import { ACTIVITY_MULTIPLIERS, ageOn, calcBmr, type Sex } from "./nutrition";
import { sumBurned } from "./workouts";

/** D3: kcal in 1 kg of body fat. */
export const KCAL_PER_KG = 7700;

/** D1: the baseline always uses the sedentary multiplier, not the profile activity level. */
export const BASELINE_MULTIPLIER = ACTIVITY_MULTIPLIERS.sedentary;

/** D2: the current profile fields the balance needs (a subset of the settings row). */
export type BalanceProfile = { sex: Sex; birthDate: string; heightCm: number; weightKg: number };

/** D1, D2: calcBmr with age = ageOn(birthDate, date), × BASELINE_MULTIPLIER. Not rounded. */
export function baselineKcal(profile: BalanceProfile, date: string): number {
  const bmr = calcBmr({
    sex: profile.sex,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    age: ageOn(profile.birthDate, date),
  });
  return bmr * BASELINE_MULTIPLIER;
}

export type DayBalance = {
  date: string; // YYYY-MM-DD
  logged: boolean; // D6: true when the day has at least one diary entry
  eatenKcal: number; // sum of diary entry kcal
  baselineKcal: number; // D1
  burnedKcal: number; // sumBurned(workouts, steps).total
  expenditureKcal: number; // baselineKcal + burnedKcal
  balanceKcal: number; // D4: eatenKcal − expenditureKcal
  weightChangeKg: number; // D3: balanceKcal / KCAL_PER_KG (negative = loss)
};

/** Computes one day. Values are not rounded; the UI formats them. Numbers are computed even when not logged. */
export function dayBalance(input: {
  date: string;
  profile: BalanceProfile;
  diary: readonly { kcal: number }[];
  workouts: readonly { kcalBurned: number | null }[];
  steps: { kcal: number } | null;
}): DayBalance {
  const eatenKcal = input.diary.reduce((sum, e) => sum + e.kcal, 0);
  const baseline = baselineKcal(input.profile, input.date);
  const burnedKcal = sumBurned(input.workouts, input.steps).total;
  const expenditureKcal = baseline + burnedKcal;
  const balanceKcal = eatenKcal - expenditureKcal;
  return {
    date: input.date,
    logged: input.diary.length > 0,
    eatenKcal,
    baselineKcal: baseline,
    burnedKcal,
    expenditureKcal,
    balanceKcal,
    weightChangeKg: balanceKcal / KCAL_PER_KG,
  };
}

export type WeekBalance = {
  loggedDays: number; // D6
  eatenKcal: number;
  expenditureKcal: number;
  balanceKcal: number;
  weightChangeKg: number; // balanceKcal / KCAL_PER_KG
};

/** D6: sums only the days with logged === true. With no logged days, every number is 0. */
export function weekBalance(days: readonly DayBalance[]): WeekBalance {
  const logged = days.filter((d) => d.logged);
  const eatenKcal = logged.reduce((sum, d) => sum + d.eatenKcal, 0);
  const expenditureKcal = logged.reduce((sum, d) => sum + d.expenditureKcal, 0);
  const balanceKcal = eatenKcal - expenditureKcal;
  return {
    loggedDays: logged.length,
    eatenKcal,
    expenditureKcal,
    balanceKcal,
    weightChangeKg: balanceKcal / KCAL_PER_KG,
  };
}

export type BalanceStatus = "deficit" | "surplus" | "even";

/** D4: by the value rounded to a whole kcal: < 0 deficit, > 0 surplus, 0 even (so −0.4 is "even"). */
export function balanceStatus(balanceKcal: number): BalanceStatus {
  const rounded = Math.round(balanceKcal);
  if (rounded < 0) return "deficit";
  if (rounded > 0) return "surplus";
  return "even";
}
