"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Settings } from "@/server/dal/settings";
import { saveProfile } from "@/features/profile/actions";
import {
  ACTIVITY_LEVELS,
  SEXES,
  ageOn,
  calcBmr,
  calcTdee,
  type ActivityLevel,
  type Sex,
} from "@/lib/nutrition";
import { isIsoDate } from "@/lib/dates";
import type { ProfileField } from "@/lib/validation/profile";
import { FormField } from "@/components/forms/FormField";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { fieldControlClass } from "@/components/forms/field-styles";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/data/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileFormProps = { initial: Settings | null; today: string };

type Results = { age: number; bmr: number; tdee: number };

/** BMR and TDEE, or null while the form is incomplete or invalid (D1, D5). */
function computeResults(
  sex: string,
  birthDate: string,
  heightCm: string,
  weightKg: string,
  activityLevel: ActivityLevel,
  today: string,
): Results | null {
  const height = Number(heightCm.trim().replace(",", "."));
  const weight = Number(weightKg.trim().replace(",", "."));
  if (sex === "" || !isIsoDate(birthDate) || birthDate > today) return null;
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0) return null;
  const age = ageOn(birthDate, today);
  const bmr = calcBmr({ sex: sex as Sex, weightKg: weight, heightCm: height, age });
  return { age, bmr, tdee: calcTdee(bmr, activityLevel) };
}

export function ProfileForm({ initial, today }: ProfileFormProps) {
  const t = useTranslations("profile");
  const [state, formAction] = useActionState(saveProfile, null);

  const [sex, setSex] = useState<string>(initial?.sex ?? "");
  const [birthDate, setBirthDate] = useState<string>(initial?.birthDate ?? "");
  const [heightCm, setHeightCm] = useState<string>(initial ? String(initial.heightCm) : "");
  const [weightKg, setWeightKg] = useState<string>(initial ? String(initial.weightKg) : "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (initial?.activityLevel as ActivityLevel | undefined) ?? "moderate",
  );
  const [proteinGoalG, setProteinGoalG] = useState<string>(
    initial?.proteinGoalG != null ? String(initial.proteinGoalG) : "",
  );
  const [kcalGoal, setKcalGoal] = useState<string>(initial ? String(initial.kcalGoal) : "");
  const [goalTouched, setGoalTouched] = useState<boolean>(Boolean(initial));

  const results = computeResults(sex, birthDate, heightCm, weightKg, activityLevel, today);
  const prefill = results ? String(Math.round(results.tdee)) : "";
  const goalValue = goalTouched ? kcalGoal : prefill;

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("toast.saved"));
    } else if (state && !state.ok && state.code === "unexpected") {
      toast.error(t("toast.failed"));
    }
  }, [state, t]);

  const fieldError = (field: ProfileField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const sexError = fieldError("sex");
  const birthDateError = fieldError("birthDate");
  const heightError = fieldError("heightCm");
  const weightError = fieldError("weightKg");
  const activityError = fieldError("activityLevel");
  const kcalError = fieldError("kcalGoal");
  const proteinError = fieldError("proteinGoalG");

  return (
    <form action={formAction} className="grid gap-x-8 gap-y-9 lg:grid-cols-2">
      <div>
        <FormField id="profile-sex" label={t("fields.sex")} error={sexError}>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger
              id="profile-sex"
              className={cn("w-full", fieldControlClass)}
              aria-invalid={sexError ? true : undefined}
              aria-describedby={sexError ? "profile-sex-error" : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEXES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sex.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="sex" value={sex} />
        </FormField>

        <FormField id="profile-birthDate" label={t("fields.birthDate")} error={birthDateError}>
          <Input
            id="profile-birthDate"
            type="date"
            name="birthDate"
            max={today}
            className={fieldControlClass}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-invalid={birthDateError ? true : undefined}
            aria-describedby={birthDateError ? "profile-birthDate-error" : undefined}
          />
        </FormField>

        <FormField id="profile-heightCm" label={t("fields.heightCm")} error={heightError}>
          <NumberInput
            id="profile-heightCm"
            name="heightCm"
            unit={t("units.cm")}
            value={heightCm}
            onChange={setHeightCm}
            aria-invalid={heightError ? true : undefined}
            aria-describedby={heightError ? "profile-heightCm-error" : undefined}
          />
        </FormField>

        <FormField id="profile-weightKg" label={t("fields.weightKg")} error={weightError}>
          <NumberInput
            id="profile-weightKg"
            name="weightKg"
            unit={t("units.kg")}
            value={weightKg}
            onChange={setWeightKg}
            aria-invalid={weightError ? true : undefined}
            aria-describedby={weightError ? "profile-weightKg-error" : undefined}
          />
        </FormField>

        <FormField id="profile-activityLevel" label={t("fields.activityLevel")} error={activityError}>
          <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
            <SelectTrigger
              id="profile-activityLevel"
              className={cn("w-full", fieldControlClass)}
              aria-invalid={activityError ? true : undefined}
              aria-describedby={activityError ? "profile-activityLevel-error" : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {t(`activity.${level}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="activityLevel" value={activityLevel} />
        </FormField>

        <FormField id="profile-kcalGoal" label={t("fields.kcalGoal")} error={kcalError}>
          <div className="flex items-center gap-2">
            <NumberInput
              id="profile-kcalGoal"
              name="kcalGoal"
              unit={t("units.kcal")}
              value={goalValue}
              onChange={(v) => {
                setKcalGoal(v);
                setGoalTouched(true);
              }}
              aria-invalid={kcalError ? true : undefined}
              aria-describedby={kcalError ? "profile-kcalGoal-error" : undefined}
            />
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              disabled={!results}
              onClick={() => {
                if (!results) return;
                setKcalGoal(String(Math.round(results.tdee)));
                setGoalTouched(true);
              }}
            >
              {t("results.useAsGoal")}
            </Button>
          </div>
        </FormField>

        <FormField id="profile-proteinGoalG" label={t("fields.proteinGoalG")} error={proteinError}>
          <NumberInput
            id="profile-proteinGoalG"
            name="proteinGoalG"
            unit={t("units.g")}
            value={proteinGoalG}
            onChange={setProteinGoalG}
            aria-invalid={proteinError ? true : undefined}
            aria-describedby={proteinError ? "profile-proteinGoalG-error" : undefined}
          />
        </FormField>

        <div className="flex justify-end pt-9">
          <SubmitButton pendingLabel={t("actions.saving")}>{t("actions.save")}</SubmitButton>
        </div>
      </div>

      <aside>
        <h2 className="flex h-9 items-end font-hand text-2xl leading-none text-primary">
          {t("results.title")}
        </h2>
        {results ? (
          // Each card spans exactly three ruled lines (h-27 = 3 × 2.25rem), one empty line apart,
          // so card edges land on the ruling like notes stuck onto the page. mt-9 leaves one empty
          // line under the heading so its descenders (j, p, y) don't touch the first card.
          <div className="mt-9 space-y-9">
            <StatCard
              className="min-h-27 py-3"
              label={t("results.age")}
              value={results.age}
              unit={t("results.years")}
            />
            <StatCard
              className="min-h-27 py-3"
              label={t("results.bmr")}
              hint={t("results.bmrHint")}
              value={results.bmr}
              unit={t("units.kcal")}
            />
            <StatCard
              className="min-h-27 py-3"
              label={t("results.tdee")}
              hint={t("results.tdeeHint")}
              value={results.tdee}
              unit={t("units.kcal")}
            />
          </div>
        ) : (
          <p className="text-sm leading-9 text-muted-foreground">{t("results.incomplete")}</p>
        )}
      </aside>
    </form>
  );
}
