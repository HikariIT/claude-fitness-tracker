import { sql } from "drizzle-orm";
import { db, pool } from "@/db/client";
import {
  diaryEntries,
  exercises,
  foods,
  settings,
  treadmillSessions,
  workoutSets,
  workouts,
} from "@/db/schema";

// Resets the tables and inserts mock records, then checks the relations.
// Safe to run repeatedly: the transaction truncates and restarts identities.

const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown) {
  const same =
    typeof expected === "object" && expected !== null
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;
  if (same) {
    console.log(`OK ${label}`);
  } else {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOffset = (offset: number) => {
  const now = new Date();
  return ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};
const round2 = (n: number) => Math.round(n * 100) / 100;

const foodSeed = [
  { name: "Ryż gotowany", kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
  { name: "Sos curry", kcal: 110, proteinG: 2.0, carbsG: 9.5, fatG: 7.0 },
  { name: "Pierś z kurczaka", kcal: 120, proteinG: 23.0, carbsG: 0, fatG: 2.6 },
  { name: "Jajko kurze", kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  { name: "Płatki owsiane", kcal: 379, proteinG: 13.2, carbsG: 67.7, fatG: 6.5 },
  { name: "Jogurt naturalny", kcal: 61, proteinG: 4.3, carbsG: 4.7, fatG: 3.0 },
  { name: "Jabłko", kcal: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2 },
  { name: "Chleb żytni", kcal: 259, proteinG: 8.5, carbsG: 48.3, fatG: 3.3 },
] as const;

// Day offsets are relative to today (-2 = two days ago).
type MealName = "breakfast" | "lunch" | "dinner" | "snack" | "other";
const diarySeed: { offset: number; meal: MealName; food: string; grams: number }[] = [
  { offset: -2, meal: "breakfast", food: "Płatki owsiane", grams: 60 },
  { offset: -2, meal: "breakfast", food: "Jogurt naturalny", grams: 150 },
  { offset: -2, meal: "lunch", food: "Pierś z kurczaka", grams: 180 },
  { offset: -2, meal: "dinner", food: "Ryż gotowany", grams: 150 },
  { offset: -1, meal: "breakfast", food: "Jajko kurze", grams: 120 },
  { offset: -1, meal: "lunch", food: "Chleb żytni", grams: 90 },
  { offset: -1, meal: "dinner", food: "Pierś z kurczaka", grams: 200 },
  { offset: -1, meal: "other", food: "Jabłko", grams: 120 },
  { offset: 0, meal: "breakfast", food: "Jogurt naturalny", grams: 200 },
  { offset: 0, meal: "lunch", food: "Ryż gotowany", grams: 180 },
  { offset: 0, meal: "lunch", food: "Sos curry", grams: 80 },
  { offset: 0, meal: "dinner", food: "Pierś z kurczaka", grams: 180 },
];

const exerciseSeed = ["Przysiad ze sztangą", "Wyciskanie leżąc", "Martwy ciąg"];

async function main() {
  try {
    const expectedEntryCount = diarySeed.length;
    const today = dayOffset(0);
    const yesterday = dayOffset(-1);

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`TRUNCATE settings, foods, diary_entries, workouts, treadmill_sessions, exercises, workout_sets RESTART IDENTITY CASCADE`,
      );

      await tx.insert(settings).values({
        id: 1,
        sex: "female",
        birthDate: "1995-04-12",
        heightCm: 168,
        weightKg: 62.5,
        activityLevel: "moderate",
        kcalGoal: 1800,
        proteinGoalG: 110,
      });

      const insertedFoods = await tx.insert(foods).values([...foodSeed]).returning();
      const foodByName = new Map(insertedFoods.map((f) => [f.name, f]));

      const entryRows = diarySeed.map((entry) => {
        const food = foodByName.get(entry.food);
        if (!food) throw new Error(`Seed food missing: ${entry.food}`);
        const factor = entry.grams / 100;
        return {
          date: dayOffset(entry.offset),
          meal: entry.meal,
          foodId: food.id,
          quantityG: entry.grams,
          kcal: round2(food.kcal * factor),
          proteinG: round2(food.proteinG * factor),
          carbsG: round2(food.carbsG * factor),
          fatG: round2(food.fatG * factor),
        };
      });
      await tx.insert(diaryEntries).values(entryRows);

      const insertedExercises = await tx
        .insert(exercises)
        .values(exerciseSeed.map((name) => ({ name })))
        .returning();
      const [squat, bench, deadlift] = insertedExercises;
      if (!squat || !bench || !deadlift) throw new Error("Seed exercises missing");

      const [treadmill] = await tx
        .insert(workouts)
        .values({ type: "treadmill", date: today, name: "Bieżnia", kcalBurned: 320 })
        .returning();
      if (!treadmill) throw new Error("Seed treadmill workout missing");
      await tx.insert(treadmillSessions).values({
        workoutId: treadmill.id,
        durationMin: 40,
        speedKmh: 6.5,
        inclinePct: 8,
        distanceKm: 4.33,
      });

      const [training] = await tx
        .insert(workouts)
        .values({
          type: "training",
          date: yesterday,
          name: "Trening siłowy",
          kcalBurned: 250,
          notes: "Dzień nóg i pleców",
        })
        .returning();
      if (!training) throw new Error("Seed training workout missing");
      await tx.insert(workoutSets).values([
        { workoutId: training.id, exerciseId: squat.id, order: 1, reps: 8, weightKg: 60 },
        { workoutId: training.id, exerciseId: squat.id, order: 2, reps: 6, weightKg: 65 },
        { workoutId: training.id, exerciseId: bench.id, order: 3, reps: 10, weightKg: 40 },
        { workoutId: training.id, exerciseId: bench.id, order: 4, reps: 8, weightKg: 42.5 },
        { workoutId: training.id, exerciseId: deadlift.id, order: 5, reps: 5, weightKg: 80 },
        { workoutId: training.id, exerciseId: deadlift.id, order: 6, reps: 7, weightKg: null },
      ]);
    });

    console.log("Seed inserted. Running relation checks...");

    const entries = await db.query.diaryEntries.findMany({ with: { food: true } });
    expect("diary entry count", entries.length, expectedEntryCount);
    expect(
      "every diary entry has a food",
      entries.every((e) => e.food !== null),
      true,
    );
    const seededNames: string[] = foodSeed.map((f) => f.name);
    expect(
      "every diary food name is seeded",
      entries.every((e) => e.food !== null && seededNames.includes(e.food.name)),
      true,
    );

    const rice = await db.query.foods.findFirst({
      where: (f, { eq }) => eq(f.name, "Ryż gotowany"),
      with: { diaryEntries: true },
    });
    expect("rice food found", rice !== undefined, true);
    expect(
      "rice diary entry count",
      rice?.diaryEntries.length,
      diarySeed.filter((e) => e.food === "Ryż gotowany").length,
    );

    const oats = await db.query.foods.findFirst({ where: (f, { eq }) => eq(f.name, "Płatki owsiane") });
    expect("diacritics kept in food name", oats?.name, "Płatki owsiane");
    const squatExercise = await db.query.exercises.findFirst({
      where: (e, { eq }) => eq(e.name, "Przysiad ze sztangą"),
    });
    expect("diacritics kept in exercise name", squatExercise?.name, "Przysiad ze sztangą");

    const allWorkouts = await db.query.workouts.findMany({
      with: { treadmillSession: true, sets: { with: { exercise: true } } },
    });
    expect("workout count", allWorkouts.length, 2);

    const treadmillWorkout = allWorkouts.find((w) => w.type === "treadmill");
    expect("treadmill workout found", treadmillWorkout !== undefined, true);
    expect("treadmill session attached", treadmillWorkout?.treadmillSession != null, true);
    expect("treadmill speed is a number", treadmillWorkout?.treadmillSession?.speedKmh, 6.5);
    expect("treadmill workout has no sets", treadmillWorkout?.sets.length, 0);

    const trainingWorkout = allWorkouts.find((w) => w.type === "training");
    expect("training workout found", trainingWorkout !== undefined, true);
    expect("training workout has no treadmill session", trainingWorkout?.treadmillSession, null);
    expect("training workout set count", trainingWorkout?.sets.length, 6);
    expect(
      "every training set has an exercise",
      trainingWorkout?.sets.every((s) => s.exercise !== null) ?? false,
      true,
    );

    const settingsRow = await db.query.settings.findFirst();
    expect("settings row id", settingsRow?.id, 1);
    expect("settings kcal goal", settingsRow?.kcalGoal, 1800);
  } catch (error) {
    failures.push(`seed failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await pool.end();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll seed checks passed.");
    process.exitCode = 0;
  }
}

void main();
