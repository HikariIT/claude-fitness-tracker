import { describe, expect, it } from "vitest";
import { parseStepsForm, parseWorkoutForm } from "./workouts";

function treadmillForm(overrides: Record<string, string> = {}): FormData {
  const values: Record<string, string> = {
    date: "2026-11-10",
    type: "treadmill",
    kcalBurned: "250",
    notes: "",
    durationMin: "30",
    speedKmh: "6,5",
    inclinePct: "2",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

type Row = { exerciseId?: string; exerciseName?: string; reps: string; weightKg?: string };

function trainingForm(options: { name?: string; notes?: string; rows?: Row[] } = {}): FormData {
  const data = new FormData();
  data.set("date", "2026-11-10");
  data.set("type", "training");
  data.set("kcalBurned", "300");
  data.set("notes", options.notes ?? "");
  data.set("name", options.name ?? "Push");
  for (const row of options.rows ?? [
    { exerciseId: "3", reps: "10", weightKg: "" },
    { exerciseName: "Dips", reps: "8", weightKg: "42,5" },
  ]) {
    data.append("setExerciseId", row.exerciseId ?? "");
    data.append("setExerciseName", row.exerciseName ?? "");
    data.append("setReps", row.reps);
    data.append("setWeightKg", row.weightKg ?? "");
  }
  return data;
}

function errorsFor(data: FormData) {
  const result = parseWorkoutForm(data);
  if (result.ok) throw new Error("expected validation to fail");
  return result.fieldErrors;
}

describe("parseWorkoutForm: treadmill", () => {
  it("parses a valid session, accepting a comma decimal for speed", () => {
    expect(parseWorkoutForm(treadmillForm())).toEqual({
      ok: true,
      data: {
        type: "treadmill",
        date: "2026-11-10",
        kcalBurned: 250,
        notes: null,
        durationMin: 30,
        speedKmh: 6.5,
        inclinePct: 2,
      },
    });
  });

  it("accepts range boundaries", () => {
    const low = parseWorkoutForm(
      treadmillForm({ durationMin: "1", speedKmh: "0.5", inclinePct: "0", kcalBurned: "0" }),
    );
    const high = parseWorkoutForm(
      treadmillForm({ durationMin: "600", speedKmh: "25", inclinePct: "15", kcalBurned: "5000" }),
    );
    expect(low.ok).toBe(true);
    expect(high.ok).toBe(true);
  });

  it("reports each out-of-range treadmill field with its code", () => {
    expect(errorsFor(treadmillForm({ durationMin: "0" }))).toEqual({ durationMin: "durationRange" });
    expect(errorsFor(treadmillForm({ durationMin: "600,5" }))).toEqual({ durationMin: "durationRange" });
    expect(errorsFor(treadmillForm({ speedKmh: "0,4" }))).toEqual({ speedKmh: "speedRange" });
    expect(errorsFor(treadmillForm({ speedKmh: "25,1" }))).toEqual({ speedKmh: "speedRange" });
    expect(errorsFor(treadmillForm({ inclinePct: "-1" }))).toEqual({ inclinePct: "inclineRange" });
    expect(errorsFor(treadmillForm({ inclinePct: "15,1" }))).toEqual({ inclinePct: "inclineRange" });
    expect(errorsFor(treadmillForm({ kcalBurned: "5001" }))).toEqual({ kcalBurned: "kcalRange" });
    expect(errorsFor(treadmillForm({ kcalBurned: "12.5" }))).toEqual({ kcalBurned: "kcalRange" });
  });

  it("rejects an invalid date and returns only the errors found so far for an invalid type", () => {
    expect(errorsFor(treadmillForm({ date: "2026-02-30" }))).toEqual({ date: "dateInvalid" });
    expect(errorsFor(treadmillForm({ type: "swimming", durationMin: "0" }))).toEqual({
      type: "typeInvalid",
    });
  });

  it("rejects notes longer than 500 characters and keeps empty notes as null", () => {
    expect(errorsFor(treadmillForm({ notes: "a".repeat(501) }))).toEqual({ notes: "notesTooLong" });

    const withNotes = parseWorkoutForm(treadmillForm({ notes: "a".repeat(500) }));
    expect(withNotes.ok).toBe(true);
    if (withNotes.ok) expect(withNotes.data.notes).toHaveLength(500);

    const blank = parseWorkoutForm(treadmillForm({ notes: "   " }));
    expect(blank.ok && blank.data.notes).toBe(null);
  });
});

describe("parseWorkoutForm: training", () => {
  it("parses a valid form with one existing exercise and one new name", () => {
    expect(
      parseWorkoutForm(
        trainingForm({
          name: "  Push   day ",
          rows: [
            { exerciseId: "3", reps: "10", weightKg: "" },
            { exerciseName: "  Dips  ", reps: "8", weightKg: "42,5" },
          ],
        }),
      ),
    ).toEqual({
      ok: true,
      data: {
        type: "training",
        date: "2026-11-10",
        kcalBurned: 300,
        notes: null,
        name: "Push day",
        sets: [
          { exercise: { exerciseId: 3 }, reps: 10, weightKg: null },
          { exercise: { newName: "Dips" }, reps: 8, weightKg: 42.5 },
        ],
      },
    });
  });

  it("treats an empty name as null", () => {
    const result = parseWorkoutForm(trainingForm({ name: "   " }));
    expect(result.ok && result.data.type === "training" && result.data.name).toBe(null);
  });

  it("requires at least one set", () => {
    expect(errorsFor(trainingForm({ rows: [] }))).toEqual({ sets: "setsRequired" });
  });

  it("rejects more than 100 sets", () => {
    const rows = Array.from({ length: 101 }, () => ({ exerciseId: "1", reps: "1" }));
    expect(errorsFor(trainingForm({ rows }))).toEqual({ sets: "setsTooMany" });
  });

  it("records the first failing check of each row under its own index", () => {
    const errors = errorsFor(
      trainingForm({
        rows: [
          { exerciseId: "3", reps: "10" },
          { exerciseId: "0", reps: "abc" },
          { exerciseName: "   ", reps: "0" },
          { exerciseName: "Plank", reps: "0" },
          { exerciseId: "2", reps: "5", weightKg: "1001" },
          { exerciseId: "2", reps: "1000", weightKg: "1000" },
          { exerciseName: "x".repeat(101), reps: "5" },
        ],
      }),
    );
    expect(errors).toEqual({
      "set.1": "exerciseUnavailable",
      "set.2": "setExerciseRequired",
      "set.3": "setRepsRange",
      "set.4": "setWeightRange",
      "set.6": "setExerciseNameTooLong",
    });
  });

  it("rejects a reps value of 1001 and a weight of 1000,01", () => {
    expect(errorsFor(trainingForm({ rows: [{ exerciseId: "1", reps: "1001" }] }))).toEqual({
      "set.0": "setRepsRange",
    });
    expect(
      errorsFor(trainingForm({ rows: [{ exerciseId: "1", reps: "1", weightKg: "1000,01" }] })),
    ).toEqual({ "set.0": "setWeightRange" });
  });

  it("rejects a training name longer than 100 characters", () => {
    expect(errorsFor(trainingForm({ name: "n".repeat(101) }))).toEqual({ name: "nameTooLong" });
  });
});

describe("parseStepsForm", () => {
  function stepsForm(overrides: Record<string, string> = {}): FormData {
    const values: Record<string, string> = {
      date: "2026-11-10",
      steps: "8500",
      kcal: "340",
      ...overrides,
    };
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("parses a valid form", () => {
    expect(parseStepsForm(stepsForm())).toEqual({
      ok: true,
      data: { date: "2026-11-10", steps: 8500, kcal: 340 },
    });
  });

  it("rejects a decimal step count", () => {
    expect(parseStepsForm(stepsForm({ steps: "1.5" }))).toEqual({
      ok: false,
      fieldErrors: { steps: "stepsRange" },
    });
  });

  it("rejects kcal above 5000", () => {
    expect(parseStepsForm(stepsForm({ kcal: "5001" }))).toEqual({
      ok: false,
      fieldErrors: { kcal: "kcalRange" },
    });
  });

  it("accepts the step boundary 100000 and rejects 100001", () => {
    expect(parseStepsForm(stepsForm({ steps: "100000" })).ok).toBe(true);
    expect(parseStepsForm(stepsForm({ steps: "100001" }))).toEqual({
      ok: false,
      fieldErrors: { steps: "stepsRange" },
    });
  });
});
