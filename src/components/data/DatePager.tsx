import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { addDays, isoToUtcDate } from "@/lib/dates";

type DatePagerProps = {
  date: string;
  basePath: "/planner" | "/workouts" | "/balance";
};

export function DatePager({ date, basePath }: DatePagerProps) {
  const t = useTranslations("datePager");
  const format = useFormatter();
  const label = format.dateTime(isoToUtcDate(date), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-2">
      <Link
        href={`${basePath}/${addDays(date, -1)}`}
        aria-label={t("previous")}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <ChevronLeft />
      </Link>
      <div className="flex flex-1 flex-col items-center gap-1 text-center">
        <p className="font-hand text-2xl leading-7 text-primary">{label}</p>
        <Link href={basePath} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("today")}
        </Link>
      </div>
      <Link
        href={`${basePath}/${addDays(date, 1)}`}
        aria-label={t("next")}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}
