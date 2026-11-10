export const SEXES = ["male", "female"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type Sex = (typeof SEXES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function parseParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/** Full years between birthDate and today (both "YYYY-MM-DD"). Uses string/number parts, no Date, no timezone. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = parseParts(birthDate);
  const [ty, tm, td] = parseParts(today);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** Mifflin-St Jeor, kcal/day, not rounded. */
export function calcBmr(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

/** BMR × ACTIVITY_MULTIPLIERS[level], not rounded. */
export function calcTdee(bmr: number, level: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[level];
}
