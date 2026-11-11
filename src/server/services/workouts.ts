import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dailySteps, exercises, treadmillSessions, workoutSets, workouts } from "@/db/schema";
import type { SetExerciseRef, StepsInput, WorkoutInput, WorkoutSetInput } from "@/lib/validation/workouts";
import type { DailySteps, Workout } from "@/server/dal/workouts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type WorkoutWriteResult =
  | { ok: true; workout: Workout; createdExercises: boolean }
  | { ok: false; reason: "notFound" | "exerciseUnavailable" };
export type WorkoutDeleteResult = { ok: true; date: string } | { ok: false; reason: "notFound" };

/**
 * Resolves every set's exercise to an id, before anything is written.
 * Existing ids must exist and not be archived (otherwise `ok: false`). A new name reuses an exercise
 * whose name matches ignoring case, even an archived one, and otherwise inserts it (D6).
 */
async function resolveExerciseIds(
  tx: Tx,
  sets: WorkoutSetInput[],
): Promise<{ ok: true; ids: number[]; created: boolean } | { ok: false }> {
  const knownIds = [
    ...new Set(sets.flatMap((s) => ("exerciseId" in s.exercise ? [s.exercise.exerciseId] : []))),
  ];
  if (knownIds.length > 0) {
    const rows = await tx
      .select({ id: exercises.id, archivedAt: exercises.archivedAt })
      .from(exercises)
      .where(inArray(exercises.id, knownIds));
    const usable = new Set(rows.filter((r) => r.archivedAt === null).map((r) => r.id));
    if (knownIds.some((id) => !usable.has(id))) return { ok: false };
  }

  const idByName = new Map<string, number>();
  const ids: number[] = [];
  let created = false;
  for (const set of sets) {
    const ref: SetExerciseRef = set.exercise;
    if ("exerciseId" in ref) {
      ids.push(ref.exerciseId);
      continue;
    }
    const key = ref.newName.toLowerCase();
    let id = idByName.get(key);
    if (id === undefined) {
      const [existing] = await tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(sql`lower(${exercises.name}) = lower(${ref.newName})`)
        .limit(1);
      if (existing) {
        id = existing.id;
      } else {
        const [inserted] = await tx
          .insert(exercises)
          .values({ name: ref.newName })
          .returning({ id: exercises.id });
        id = inserted.id;
        created = true;
      }
      idByName.set(key, id);
    }
    ids.push(id);
  }
  return { ok: true, ids, created };
}

/** D2, D3, D5: inserts the workout with its treadmill session or its ordered sets. */
export async function createWorkout(input: WorkoutInput): Promise<WorkoutWriteResult> {
  return db.transaction(async (tx) => {
    let ids: number[] = [];
    let created = false;
    if (input.type === "training") {
      const resolved = await resolveExerciseIds(tx, input.sets);
      if (!resolved.ok) return { ok: false, reason: "exerciseUnavailable" };
      ids = resolved.ids;
      created = resolved.created;
    }

    const [workout] = await tx
      .insert(workouts)
      .values({
        type: input.type,
        date: input.date,
        kcalBurned: input.kcalBurned,
        notes: input.notes,
        name: input.type === "training" ? input.name : null,
      })
      .returning();

    if (input.type === "treadmill") {
      await tx.insert(treadmillSessions).values({
        workoutId: workout.id,
        durationMin: input.durationMin,
        speedKmh: input.speedKmh,
        inclinePct: input.inclinePct,
      });
    } else {
      await tx.insert(workoutSets).values(
        input.sets.map((set, index) => ({
          workoutId: workout.id,
          exerciseId: ids[index],
          order: index + 1,
          reps: set.reps,
          weightKg: set.weightKg,
        })),
      );
    }
    return { ok: true, workout, createdExercises: created };
  });
}

/**
 * D8: the type is fixed, so a type mismatch is `notFound`. The stored date is kept.
 * Treadmill: updates the session (inserting it if missing). Training: replaces all sets.
 */
export async function updateWorkout(id: number, input: WorkoutInput): Promise<WorkoutWriteResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(workouts).where(eq(workouts.id, id)).limit(1);
    if (!existing || existing.type !== input.type) return { ok: false, reason: "notFound" };

    let ids: number[] = [];
    let created = false;
    if (input.type === "training") {
      const resolved = await resolveExerciseIds(tx, input.sets);
      if (!resolved.ok) return { ok: false, reason: "exerciseUnavailable" };
      ids = resolved.ids;
      created = resolved.created;
    }

    const [workout] = await tx
      .update(workouts)
      .set({
        name: input.type === "training" ? input.name : null,
        notes: input.notes,
        kcalBurned: input.kcalBurned,
        updatedAt: new Date(),
      })
      .where(eq(workouts.id, id))
      .returning();

    if (input.type === "treadmill") {
      const values = {
        durationMin: input.durationMin,
        speedKmh: input.speedKmh,
        inclinePct: input.inclinePct,
      };
      const [session] = await tx
        .select({ id: treadmillSessions.id })
        .from(treadmillSessions)
        .where(eq(treadmillSessions.workoutId, id))
        .limit(1);
      if (session) {
        await tx
          .update(treadmillSessions)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(treadmillSessions.workoutId, id));
      } else {
        await tx.insert(treadmillSessions).values({ workoutId: id, ...values });
      }
    } else {
      await tx.delete(workoutSets).where(eq(workoutSets.workoutId, id));
      await tx.insert(workoutSets).values(
        input.sets.map((set, index) => ({
          workoutId: id,
          exerciseId: ids[index],
          order: index + 1,
          reps: set.reps,
          weightKg: set.weightKg,
        })),
      );
    }
    return { ok: true, workout, createdExercises: created };
  });
}

/** Sessions and sets cascade. Returns the date so the caller can invalidate that day. */
export async function deleteWorkout(id: number): Promise<WorkoutDeleteResult> {
  const [row] = await db
    .delete(workouts)
    .where(eq(workouts.id, id))
    .returning({ date: workouts.date });
  if (!row) return { ok: false, reason: "notFound" };
  return { ok: true, date: row.date };
}

/** D7: one row per date. Inserts, or updates steps and kcal when the date already has a row. */
export async function saveDailySteps(input: StepsInput): Promise<DailySteps> {
  const [row] = await db
    .insert(dailySteps)
    .values(input)
    .onConflictDoUpdate({
      target: dailySteps.date,
      set: { steps: input.steps, kcal: input.kcal, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/** Removes the day's steps row. A missing row is not an error. */
export async function clearDailySteps(date: string): Promise<void> {
  await db.delete(dailySteps).where(eq(dailySteps.date, date));
}
