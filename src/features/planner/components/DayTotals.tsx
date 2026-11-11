"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatCard } from "@/components/data/StatCard";
import { Link } from "@/i18n/navigation";
import type { Nutrition } from "@/lib/diary";
import { cn } from "@/lib/utils";

/** null = no saved profile yet. proteinG is optional in the profile. */
export type DayGoals = { kcal: number; proteinG: number | null } | null;

type DayTotalsProps = { totals: Nutrition; goals: DayGoals };

const goalLinkClass = "text-primary underline underline-offset-4";

export function DayTotals({ totals, goals }: DayTotalsProps) {
  const t = useTranslations("planner");
  const format = useFormatter();
  const whole = (n: number) => format.number(Math.round(n));
  const oneDecimal = (n: number) => format.number(n, { maximumFractionDigits: 1 });

  return (
    <section aria-labelledby="day-totals-title">
      <h2 id="day-totals-title" className="font-hand text-2xl leading-9 text-primary">
        {t("totals.title")}
      </h2>
      {/* Cards are 3 ruled lines tall; rows stack one line apart so the grid stays on the ruling. */}
      <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4">
        <StatCard className="min-h-27 py-3" label={t("totals.kcal")} value={totals.kcal} unit={t("units.kcal")} />
        <StatCard
          className="min-h-27 py-3"
          label={t("totals.proteinG")}
          value={totals.proteinG}
          unit={t("units.g")}
          maximumFractionDigits={1}
        />
        <StatCard
          className="min-h-27 py-3"
          label={t("totals.carbsG")}
          value={totals.carbsG}
          unit={t("units.g")}
          maximumFractionDigits={1}
        />
        <StatCard
          className="min-h-27 py-3"
          label={t("totals.fatG")}
          value={totals.fatG}
          unit={t("units.g")}
          maximumFractionDigits={1}
        />
      </div>

      {goals === null ? (
        <p className="mt-9 text-muted-foreground">
          {t("totals.noGoal")}{" "}
          <Link href="/profile" className={goalLinkClass}>
            {t("totals.noGoalLink")}
          </Link>
        </p>
      ) : (
        // D6: eaten vs goal, kcal first, then protein (optional in the profile, so it can be unset).
        <dl className="mt-9 grid grid-cols-[auto_1fr] gap-x-6">
          <dt className="text-muted-foreground">{t("totals.kcal")}</dt>
          <dd className="font-hand text-xl leading-9">
            <GoalLine
              progress={t("totals.goal", { eaten: whole(totals.kcal), goal: format.number(goals.kcal) })}
              status={
                goals.kcal - totals.kcal >= 0
                  ? t("totals.remaining", { kcal: whole(goals.kcal - totals.kcal) })
                  : t("totals.over", { kcal: whole(totals.kcal - goals.kcal) })
              }
              warn={Math.round(totals.kcal) > goals.kcal}
            />
          </dd>

          <dt className="text-muted-foreground">{t("totals.proteinG")}</dt>
          <dd className={goals.proteinG === null ? "text-muted-foreground" : "font-hand text-xl leading-9"}>
            {goals.proteinG === null ? (
              <>
                {t("totals.proteinNoGoal")}{" "}
                <Link href="/profile" className={goalLinkClass}>
                  {t("totals.setGoalLink")}
                </Link>
              </>
            ) : (
              <GoalLine
                progress={t("totals.proteinGoal", {
                  eaten: oneDecimal(totals.proteinG),
                  goal: format.number(goals.proteinG),
                })}
                status={
                  totals.proteinG < goals.proteinG
                    ? t("totals.proteinRemaining", { grams: oneDecimal(goals.proteinG - totals.proteinG) })
                    : t("totals.proteinReached")
                }
                warn={false}
              />
            )}
          </dd>
        </dl>
      )}
    </section>
  );
}

function GoalLine({ progress, status, warn }: { progress: string; status: string; warn: boolean }) {
  return (
    <>
      <span className="text-primary">{progress}</span>
      <span className="text-muted-foreground" aria-hidden="true">
        {" · "}
      </span>
      <span className={cn(warn ? "text-destructive" : "text-steel-blue-300")}>{status}</span>
    </>
  );
}
