import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { addDays, isoToUtcDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type DatePagerProps = {
  date: string;
  basePath: "/planner" | "/workouts" | "/balance";
};

const arrowClass = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "text-steel-blue-300 hover:bg-icy-blue-800 hover:text-primary",
);

/** A card two ruled lines tall (h-18), the same surface as StatCard, so it sits on the notebook ruling. */
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
    <nav
      aria-label={t("label")}
      className="flex h-18 items-center justify-between gap-2 rounded-xl border bg-platinum-900 px-3 shadow-sm"
    >
      <Link href={`${basePath}/${addDays(date, -1)}`} aria-label={t("previous")} className={arrowClass}>
        <ChevronLeft />
      </Link>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4">
        <p className="font-hand text-2xl leading-9 text-primary first-letter:uppercase">{label}</p>
        <Link href={basePath} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("today")}
        </Link>
      </div>
      <Link href={`${basePath}/${addDays(date, 1)}`} aria-label={t("next")} className={arrowClass}>
        <ChevronRight />
      </Link>
    </nav>
  );
}
