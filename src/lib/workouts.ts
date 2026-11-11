/** Must match workoutTypeEnum in src/db/schema/enums.ts. */
export const WORKOUT_TYPES = ["treadmill", "training"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export function isWorkoutType(value: string): value is WorkoutType {
  return (WORKOUT_TYPES as readonly string[]).includes(value);
}

/** Speed at or above which the ACSM running equation is used instead of walking (D4). */
export const RUNNING_THRESHOLD_KMH = 8;

/** D3: km = speed × minutes / 60, rounded to 2 decimals. */
export function treadmillDistanceKm(speedKmh: number, durationMin: number): number {
  return Math.round(((speedKmh * durationMin) / 60) * 100) / 100;
}

/**
 * D4: ACSM gross energy estimate, rounded to a whole kcal.
 * s = speedKmh × 1000 / 60 (m/min), g = inclinePct / 100.
 * Walking (speed < RUNNING_THRESHOLD_KMH): VO2 = 0.1·s + 1.8·s·g + 3.5 (ml/kg/min)
 * Running (speed ≥ threshold):             VO2 = 0.2·s + 0.9·s·g + 3.5
 * kcal = VO2 × weightKg × durationMin / 1000 × 5
 */
export function estimateTreadmillKcal(input: {
  speedKmh: number;
  inclinePct: number;
  durationMin: number;
  weightKg: number;
}): number {
  const s = (input.speedKmh * 1000) / 60;
  const g = input.inclinePct / 100;
  const vo2 =
    input.speedKmh >= RUNNING_THRESHOLD_KMH
      ? 0.2 * s + 0.9 * s * g + 3.5
      : 0.1 * s + 1.8 * s * g + 3.5;
  return Math.round((vo2 * input.weightKg * input.durationMin) / 1000 * 5);
}

/** D7: round(steps × weightKg × 0.0005). */
export function estimateStepsKcal(steps: number, weightKg: number): number {
  return Math.round(steps * weightKg * 0.0005);
}

/** D10: kcal from workouts (null kcal counts as 0), from steps (null row = 0) and their sum. */
export function sumBurned(
  workouts: readonly { kcalBurned: number | null }[],
  steps: { kcal: number } | null,
): { workouts: number; steps: number; total: number } {
  const fromWorkouts = workouts.reduce((sum, w) => sum + (w.kcalBurned ?? 0), 0);
  const fromSteps = steps?.kcal ?? 0;
  return { workouts: fromWorkouts, steps: fromSteps, total: fromWorkouts + fromSteps };
}

/**
 * For the workout card: sorts sets by `order`, then groups runs of consecutive sets with the
 * same exerciseId ([squat, squat, bench, squat] → 3 groups). Each group keeps its sets in order.
 */
export function groupConsecutiveSets<T extends { exerciseId: number; order: number }>(
  sets: readonly T[],
): { exerciseId: number; sets: T[] }[] {
  const sorted = [...sets].sort((a, b) => a.order - b.order);
  const groups: { exerciseId: number; sets: T[] }[] = [];
  for (const set of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.exerciseId === set.exerciseId) {
      last.sets.push(set);
    } else {
      groups.push({ exerciseId: set.exerciseId, sets: [set] });
    }
  }
  return groups;
}
