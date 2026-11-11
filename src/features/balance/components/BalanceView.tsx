"use client";

import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { DatePager } from "@/components/data/DatePager";
import { EmptyState } from "@/components/layout/EmptyState";
import { Link } from "@/i18n/navigation";
import type { DayBalance, WeekBalance } from "@/lib/balance";
import { DaySummary } from "./DaySummary";
import { WeekTable } from "./WeekTable";

type BalanceViewProps = {
  date: string;
  week: { days: DayBalance[]; total: WeekBalance } | null; // null = no profile (D7)
};

export function BalanceView({ date, week }: BalanceViewProps) {
  const t = useTranslations("balance");

  return (
    <div className="space-y-9">
      <DatePager date={date} basePath="/balance" />
      {week === null ? (
        <>
          <EmptyState icon={Scale} title={t("noProfile.title")} description={t("noProfile.description")} />
          <p className="text-center">
            <Link href="/profile" className="text-primary underline underline-offset-4">
              {t("noProfile.link")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <DaySummary day={week.days.find((d) => d.date === date)!} />
          <WeekTable days={week.days} total={week.total} selectedDate={date} />
        </>
      )}
    </div>
  );
}
