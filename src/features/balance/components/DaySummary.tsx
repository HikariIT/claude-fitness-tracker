"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatCard } from "@/components/data/StatCard";
import { Link } from "@/i18n/navigation";
import type { DayBalance } from "@/lib/balance";
import { BalanceStatusLabel } from "./BalanceStatusLabel";

type DaySummaryProps = { day: DayBalance };

const cardClass = "min-h-27 py-3";

export function DaySummary({ day }: DaySummaryProps) {
  const t = useTranslations("balance");
  const format = useFormatter();

  return (
    <section aria-labelledby="day-summary-title">
      <h2 id="day-summary-title" className="font-hand text-2xl leading-9 text-primary">
        {t("day.title")}
      </h2>

      {/* D6: a day with no diary entries has no numbers to show. */}
      {day.logged ? (
        <>
          {/* Cards are 3 ruled lines tall; rows stack one line apart so the grid stays on the ruling. */}
          <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4">
            <StatCard
              className={cardClass}
              label={t("day.eaten")}
              value={day.eatenKcal}
              unit={t("units.kcal")}
            />
            <StatCard
              className={cardClass}
              label={t("day.expenditure")}
              value={day.expenditureKcal}
              unit={t("units.kcal")}
              hint={t("day.expenditureHint", {
                baseline: format.number(Math.round(day.baselineKcal)),
                burned: format.number(Math.round(day.burnedKcal)),
              })}
            />
            <StatCard
              className={cardClass}
              label={t("day.balance")}
              value={day.balanceKcal}
              unit={t("units.kcal")}
              signDisplay="exceptZero"
            />
            <StatCard
              className={cardClass}
              label={t("day.weightChange")}
              value={day.weightChangeKg}
              unit={t("units.kg")}
              maximumFractionDigits={2}
              signDisplay="exceptZero"
            />
          </div>
          <p className="mt-9 font-hand text-xl leading-9">
            <BalanceStatusLabel balanceKcal={day.balanceKcal} />
          </p>
        </>
      ) : (
        <p className="mt-9 text-muted-foreground">
          {t("day.notLogged")}{" "}
          <Link href={`/planner/${day.date}`} className="text-primary underline underline-offset-4">
            {t("day.notLoggedLink")}
          </Link>
        </p>
      )}
    </section>
  );
}
