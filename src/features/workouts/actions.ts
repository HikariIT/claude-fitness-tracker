"use server";

import { updateTag } from "next/cache";
import { isIsoDate } from "@/lib/dates";
import type { ActionResult } from "@/types/action-result";
import { parseFoodId } from "@/lib/validation/foods";
import {
  parseStepsForm,
  parseWorkoutForm,
  type StepsErrorCode,
  type WorkoutErrorCode,
} from "@/lib/validation/workouts";
import {
  clearDailySteps,
  createWorkout,
  deleteWorkout,
  saveDailySteps,
  updateWorkout,
} from "@/server/services/workouts";

export type WorkoutFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, WorkoutErrorCode>
  | null;
export type WorkoutRowActionResult = ActionResult<null, WorkoutErrorCode>;
export type StepsFormState = ActionResult<{ savedAt: number }, StepsErrorCode> | null;
export type StepsClearResult = ActionResult<null, StepsErrorCode>;

/** useActionState action for the workout dialogs. Hidden field "id": empty → create, else update. */
export async function saveWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const rawId = formData.get("id");
  let id: number | null = null;
  if (typeof rawId === "string" && rawId !== "") {
    id = parseFoodId(rawId);
    if (id === null) return { ok: false, code: "unexpected" };
  }

  const parsed = parseWorkoutForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  const mode = id === null ? "created" : "updated";
  let date: string;
  let createdExercises: boolean;
  try {
    const result =
      id === null ? await createWorkout(parsed.data) : await updateWorkout(id, parsed.data);
    if (!result.ok) {
      if (result.reason === "exerciseUnavailable") {
        return { ok: false, code: "validation", fieldErrors: { sets: "exerciseUnavailable" } };
      }
      return { ok: false, code: "unexpected" };
    }
    date = result.workout.date;
    createdExercises = result.createdExercises;
  } catch (error) {
    console.error("saveWorkout failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`workouts:${date}`);
  if (createdExercises) updateTag("exercises");
  return { ok: true, data: { savedAt: Date.now(), mode } };
}

/** Called directly from the day list (not a form). */
export async function deleteWorkoutAction(id: number): Promise<WorkoutRowActionResult> {
  const workoutId = parseFoodId(id);
  if (workoutId === null) return { ok: false, code: "unexpected" };

  let date: string;
  try {
    const result = await deleteWorkout(workoutId);
    if (!result.ok) return { ok: false, code: "unexpected" };
    date = result.date;
  } catch (error) {
    console.error("deleteWorkoutAction failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`workouts:${date}`);
  return { ok: true, data: null };
}

/** useActionState action for the steps dialog. Fields: "date", "steps", "kcal". */
export async function saveSteps(
  _prev: StepsFormState,
  formData: FormData,
): Promise<StepsFormState> {
  const parsed = parseStepsForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  try {
    await saveDailySteps(parsed.data);
  } catch (error) {
    console.error("saveSteps failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`workouts:${parsed.data.date}`);
  return { ok: true, data: { savedAt: Date.now() } };
}

/** Clears one day's steps. Called directly from the steps card. */
export async function clearStepsAction(date: string): Promise<StepsClearResult> {
  if (!isIsoDate(date)) {
    return { ok: false, code: "validation", fieldErrors: { date: "dateInvalid" } };
  }

  try {
    await clearDailySteps(date);
  } catch (error) {
    console.error("clearStepsAction failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`workouts:${date}`);
  return { ok: true, data: null };
}
