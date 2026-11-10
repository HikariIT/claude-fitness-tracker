import { isIsoDate } from "@/lib/dates";
import { ACTIVITY_LEVELS, SEXES, type ActivityLevel, type Sex } from "@/lib/nutrition";

export const PROFILE_FIELDS = [
  "sex",
  "birthDate",
  "heightCm",
  "weightKg",
  "activityLevel",
  "kcalGoal",
  "proteinGoalG",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_ERROR_CODES = [
  "sexInvalid",
  "birthDateInvalid",
  "birthDateFuture",
  "heightRange",
  "weightRange",
  "activityInvalid",
  "kcalGoalRange",
  "proteinGoalRange",
] as const;
export type ProfileErrorCode = (typeof PROFILE_ERROR_CODES)[number];

export type ProfileInput = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  kcalGoal: number;
  proteinGoalG: number | null;
};

export type ProfileParseResult =
  | { ok: true; data: ProfileInput }
  | { ok: false; fieldErrors: Partial<Record<ProfileField, ProfileErrorCode>> };

const MIN_BIRTH_DATE = "1900-01-01";
const DECIMAL = /^-?\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

function readField(formData: FormData, name: ProfileField): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Parses a decimal with a comma or dot separator and rounds it to 1 decimal. Returns null if not numeric. */
function parseDecimal(raw: string): number | null {
  const normalized = raw.replace(",", ".");
  if (!DECIMAL.test(normalized)) return null;
  return Math.round(Number(normalized) * 10) / 10;
}

/** Reads the 7 fields from FormData (names equal ProfileField), validates per D6. `today` is "YYYY-MM-DD". */
export function parseProfileForm(formData: FormData, today: string): ProfileParseResult {
  const fieldErrors: Partial<Record<ProfileField, ProfileErrorCode>> = {};

  const sexRaw = readField(formData, "sex");
  const sex = (SEXES as readonly string[]).includes(sexRaw) ? (sexRaw as Sex) : undefined;
  if (!sex) fieldErrors.sex = "sexInvalid";

  const birthDate = readField(formData, "birthDate");
  if (!isIsoDate(birthDate) || birthDate < MIN_BIRTH_DATE) {
    fieldErrors.birthDate = "birthDateInvalid";
  } else if (birthDate > today) {
    fieldErrors.birthDate = "birthDateFuture";
  }

  const heightCm = parseDecimal(readField(formData, "heightCm"));
  if (heightCm === null || heightCm < 100 || heightCm > 250) {
    fieldErrors.heightCm = "heightRange";
  }

  const weightKg = parseDecimal(readField(formData, "weightKg"));
  if (weightKg === null || weightKg < 30 || weightKg > 300) {
    fieldErrors.weightKg = "weightRange";
  }

  const activityRaw = readField(formData, "activityLevel");
  const activityLevel = (ACTIVITY_LEVELS as readonly string[]).includes(activityRaw)
    ? (activityRaw as ActivityLevel)
    : undefined;
  if (!activityLevel) fieldErrors.activityLevel = "activityInvalid";

  const kcalRaw = readField(formData, "kcalGoal");
  const kcalGoal = INTEGER.test(kcalRaw) ? Number(kcalRaw) : NaN;
  if (!(kcalGoal >= 800 && kcalGoal <= 10000)) {
    fieldErrors.kcalGoal = "kcalGoalRange";
  }

  const proteinRaw = readField(formData, "proteinGoalG");
  let proteinGoalG: number | null = null;
  if (proteinRaw !== "") {
    const protein = INTEGER.test(proteinRaw) ? Number(proteinRaw) : NaN;
    if (protein >= 0 && protein <= 500) {
      proteinGoalG = protein;
    } else {
      fieldErrors.proteinGoalG = "proteinGoalRange";
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !sex || !activityLevel || heightCm === null || weightKg === null) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: { sex, birthDate, heightCm, weightKg, activityLevel, kcalGoal, proteinGoalG },
  };
}
