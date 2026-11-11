import { isIsoDate } from "@/lib/dates";
import { parseDecimal, parseInteger } from "@/lib/numbers";
import { isWorkoutType } from "@/lib/workouts";
import { parseFoodId } from "@/lib/validation/foods";

export const WORKOUT_NAME_MAX = 100;
export const WORKOUT_NOTES_MAX = 500; // D9
export const EXERCISE_NAME_MAX = 100;
export const WORKOUT_MAX_SETS = 100;

export const WORKOUT_ERROR_CODES = [
  "dateInvalid",
  "typeInvalid",
  "kcalRange",
  "notesTooLong",
  "durationRange",
  "speedRange",
  "inclineRange",
  "nameTooLong",
  "setsRequired",
  "setsTooMany",
  "setExerciseRequired",
  "setExerciseNameTooLong",
  "setRepsRange",
  "setWeightRange",
  "exerciseUnavailable", // service only: unknown or archived exercise id
] as const;
export type WorkoutErrorCode = (typeof WORKOUT_ERROR_CODES)[number];
/** `set.${index}`: row index in submitted order. */
export type WorkoutErrorField =
  | "date"
  | "type"
  | "kcalBurned"
  | "notes"
  | "durationMin"
  | "speedKmh"
  | "inclinePct"
  | "name"
  | "sets"
  | `set.${number}`;

type WorkoutBaseInput = { date: string; kcalBurned: number; notes: string | null };
export type TreadmillWorkoutInput = WorkoutBaseInput & {
  type: "treadmill";
  durationMin: number;
  speedKmh: number;
  inclinePct: number;
};
export type SetExerciseRef = { exerciseId: number } | { newName: string };
export type WorkoutSetInput = { exercise: SetExerciseRef; reps: number; weightKg: number | null };
export type TrainingWorkoutInput = WorkoutBaseInput & {
  type: "training";
  name: string | null;
  sets: WorkoutSetInput[];
};
export type WorkoutInput = TreadmillWorkoutInput | TrainingWorkoutInput;
export type WorkoutParseResult =
  | { ok: true; data: WorkoutInput }
  | { ok: false; fieldErrors: Partial<Record<WorkoutErrorField, WorkoutErrorCode>> };

export const STEPS_ERROR_CODES = ["dateInvalid", "stepsRange", "kcalRange"] as const;
export type StepsErrorCode = (typeof STEPS_ERROR_CODES)[number];
export type StepsErrorField = "date" | "steps" | "kcal";
export type StepsInput = { date: string; steps: number; kcal: number };
export type StepsParseResult =
  | { ok: true; data: StepsInput }
  | { ok: false; fieldErrors: Partial<Record<StepsErrorField, StepsErrorCode>> };

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function readAt(values: string[], index: number): string {
  return values[index] ?? "";
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/** Trimmed text, or null when empty. Internal spaces are kept. */
function trimOrNull(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** Trims and collapses internal whitespace to single spaces. */
function collapseSpaces(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Reads a workout form: "date", "type", "kcalBurned", "notes", then either the treadmill fields
 * ("durationMin", "speedKmh", "inclinePct") or the training fields ("name" and the repeated
 * "setExerciseId", "setExerciseName", "setReps", "setWeightKg").
 */
export function parseWorkoutForm(formData: FormData): WorkoutParseResult {
  const fieldErrors: Partial<Record<WorkoutErrorField, WorkoutErrorCode>> = {};

  const date = readString(formData.get("date")).trim();
  if (!isIsoDate(date)) fieldErrors.date = "dateInvalid";

  const type = readString(formData.get("type")).trim();
  if (!isWorkoutType(type)) {
    fieldErrors.type = "typeInvalid";
    return { ok: false, fieldErrors };
  }

  const kcalBurned = parseInteger(readString(formData.get("kcalBurned")));
  if (!inRange(kcalBurned, 0, 5000)) fieldErrors.kcalBurned = "kcalRange";

  const notes = trimOrNull(readString(formData.get("notes")));
  if (notes !== null && notes.length > WORKOUT_NOTES_MAX) fieldErrors.notes = "notesTooLong";

  if (type === "treadmill") {
    const durationMin = parseDecimal(readString(formData.get("durationMin")), 1);
    if (!inRange(durationMin, 1, 600)) fieldErrors.durationMin = "durationRange";

    const speedKmh = parseDecimal(readString(formData.get("speedKmh")), 1);
    if (!inRange(speedKmh, 0.5, 25)) fieldErrors.speedKmh = "speedRange";

    const inclinePct = parseDecimal(readString(formData.get("inclinePct")), 1);
    if (!inRange(inclinePct, 0, 15)) fieldErrors.inclinePct = "inclineRange";

    if (
      Object.keys(fieldErrors).length > 0 ||
      kcalBurned === null ||
      durationMin === null ||
      speedKmh === null ||
      inclinePct === null
    ) {
      return { ok: false, fieldErrors };
    }
    return {
      ok: true,
      data: { type, date, kcalBurned, notes, durationMin, speedKmh, inclinePct },
    };
  }

  // Training: the optional name, then the ordered sets.
  const name = trimOrNull(collapseSpaces(readString(formData.get("name"))));
  if (name !== null && name.length > WORKOUT_NAME_MAX) fieldErrors.name = "nameTooLong";

  const sets = parseSets(formData, fieldErrors);

  if (Object.keys(fieldErrors).length > 0 || sets === null || kcalBurned === null) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, data: { type, date, kcalBurned, notes, name, sets } };
}

/**
 * Reads the repeated set fields. The row count comes from "setReps". Each row records only its first
 * failing check under `set.${index}`. Returns null when any error was recorded.
 */
function parseSets(
  formData: FormData,
  fieldErrors: Partial<Record<WorkoutErrorField, WorkoutErrorCode>>,
): WorkoutSetInput[] | null {
  const exerciseIds = formData.getAll("setExerciseId").map(readString);
  const exerciseNames = formData.getAll("setExerciseName").map(readString);
  const repsRaw = formData.getAll("setReps").map(readString);
  const weightsRaw = formData.getAll("setWeightKg").map(readString);

  if (repsRaw.length === 0) {
    fieldErrors.sets = "setsRequired";
    return null;
  }
  if (repsRaw.length > WORKOUT_MAX_SETS) {
    fieldErrors.sets = "setsTooMany";
    return null;
  }

  const sets: WorkoutSetInput[] = [];
  let failed = false;
  repsRaw.forEach((_, index) => {
    const field = `set.${index}` as const;
    const fail = (code: WorkoutErrorCode) => {
      fieldErrors[field] = code;
      failed = true;
    };

    // 1. Exercise: an existing id, or a new name.
    let exercise: SetExerciseRef;
    const idRaw = readAt(exerciseIds, index).trim();
    if (idRaw !== "") {
      const exerciseId = parseFoodId(idRaw);
      if (exerciseId === null) return fail("exerciseUnavailable");
      exercise = { exerciseId };
    } else {
      const newName = collapseSpaces(readAt(exerciseNames, index));
      if (newName === "") return fail("setExerciseRequired");
      if (newName.length > EXERCISE_NAME_MAX) return fail("setExerciseNameTooLong");
      exercise = { newName };
    }

    // 2. Reps.
    const reps = parseInteger(readAt(repsRaw, index));
    if (!inRange(reps, 1, 1000)) return fail("setRepsRange");

    // 3. Weight (optional).
    let weightKg: number | null = null;
    const weightRaw = readAt(weightsRaw, index).trim();
    if (weightRaw !== "") {
      const parsed = parseDecimal(weightRaw, 2);
      if (!inRange(parsed, 0, 1000)) return fail("setWeightRange");
      weightKg = parsed;
    }

    sets.push({ exercise, reps, weightKg });
  });

  return failed ? null : sets;
}

/** Reads "date", "steps", "kcal" for one day's steps (D7, D11). */
export function parseStepsForm(formData: FormData): StepsParseResult {
  const fieldErrors: Partial<Record<StepsErrorField, StepsErrorCode>> = {};

  const date = readString(formData.get("date")).trim();
  if (!isIsoDate(date)) fieldErrors.date = "dateInvalid";

  const steps = parseInteger(readString(formData.get("steps")));
  if (!inRange(steps, 0, 100000)) fieldErrors.steps = "stepsRange";

  const kcal = parseInteger(readString(formData.get("kcal")));
  if (!inRange(kcal, 0, 5000)) fieldErrors.kcal = "kcalRange";

  if (Object.keys(fieldErrors).length > 0 || steps === null || kcal === null) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, data: { date, steps, kcal } };
}
