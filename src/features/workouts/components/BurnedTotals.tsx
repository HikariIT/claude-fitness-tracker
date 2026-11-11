"use client";

import { useTranslations } from "next-intl";
import { StatCard } from "@/components/data/StatCard";

type BurnedTotalsProps = { totals: { workouts: number; steps: number; total: number } };

export function BurnedTotals({ totals }: BurnedTotalsProps) {
  const t = useTranslations("workouts");

  return (
    <section aria-labelledby="burned-totals-title">
      <h2 id="burned-totals-title" className="font-hand text-2xl leading-9 text-primary">
        {t("totals.title")}
      </h2>
      {/* Cards are 3 ruled lines tall; rows stack one line apart so the grid stays on the ruling. */}
      <div className="mt-9 grid grid-cols-1 gap-x-4 gap-y-9 sm:grid-cols-3">
        <StatCard className="min-h-27 py-3" label={t("totals.workouts")} value={totals.workouts} unit={t("units.kcal")} />
        <StatCard className="min-h-27 py-3" label={t("totals.steps")} value={totals.steps} unit={t("units.kcal")} />
        <StatCard className="min-h-27 py-3" label={t("totals.total")} value={totals.total} unit={t("units.kcal")} />
      </div>
    </section>
  );
}
