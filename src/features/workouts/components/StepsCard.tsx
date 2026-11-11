"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Footprints } from "lucide-react";
import type { DailySteps } from "@/server/dal/workouts";
import { Button } from "@/components/ui/button";

type StepsCardProps = { steps: DailySteps | null; onEdit: () => void };

export function StepsCard({ steps, onEdit }: StepsCardProps) {
  const t = useTranslations("workouts");
  const format = useFormatter();

  return (
    <section aria-labelledby="steps-title">
      <div className="flex h-9 items-center justify-between gap-4">
        <h2 id="steps-title" className="font-hand text-2xl leading-9 text-primary">
          {t("steps.title")}
        </h2>
        <Button variant="outline" onClick={onEdit}>
          <Footprints aria-hidden="true" />
          {t("actions.editSteps")}
        </Button>
      </div>
      {steps === null ? (
        <p className="h-9 leading-9 text-muted-foreground">{t("steps.empty")}</p>
      ) : (
        <p className="h-9 leading-9">
          {t("steps.summary", {
            steps: format.number(steps.steps),
            kcal: format.number(steps.kcal),
          })}
        </p>
      )}
    </section>
  );
}
