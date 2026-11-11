"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { isoToUtcDate } from "@/lib/dates";
import type { DayBalance, WeekBalance } from "@/lib/balance";
import { BalanceStatusLabel } from "./BalanceStatusLabel";

type WeekTableProps = { days: DayBalance[]; total: WeekBalance; selectedDate: string }; // days: 7 entries Mon..Sun

// Notebook-ruling row styling, same as EntriesTable: one 36px line per row, no row borders.
const rowClass = "border-0 hover:bg-icy-blue-900/70";
const headClass =
  "h-9 py-0 font-hand text-lg font-normal text-primary shadow-[inset_0_-2px_0_var(--color-steel-blue-600)]";
const cellClass = "h-9 py-0";
const numClass = `${cellClass} text-right tabular-nums`;

export function WeekTable({ days, total, selectedDate }: WeekTableProps) {
  const t = useTranslations("balance");
  const format = useFormatter();
  const whole = (n: number) => format.number(Math.round(n));
  const signedWhole = (n: number) => format.number(Math.round(n), { signDisplay: "exceptZero" });
  const signedKg = (n: number) =>
    format.number(n, { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "exceptZero" });
  const dayLabel = (iso: string) =>
    format.dateTime(isoToUtcDate(iso), { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const longDate = (iso: string) =>
    format.dateTime(isoToUtcDate(iso), { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <section aria-labelledby="week-title">
      <h2 id="week-title" className="font-hand text-2xl leading-9 text-primary">
        {t("week.title", { from: longDate(days[0].date), to: longDate(days[6].date) })}
      </h2>

      <div className="mt-9">
        <Table className="text-base">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={headClass}>{t("week.day")}</TableHead>
              <TableHead className={`${headClass} text-right`}>{t("week.eaten")}</TableHead>
              <TableHead className={`${headClass} text-right`}>{t("week.expenditure")}</TableHead>
              <TableHead className={`${headClass} text-right`}>{t("week.balance")}</TableHead>
              <TableHead className={`${headClass} text-right`}>{t("week.weightChange")}</TableHead>
              <TableHead className={headClass}>{t("week.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow
                key={day.date}
                className={day.date === selectedDate ? `${rowClass} bg-icy-blue-900` : rowClass}
              >
                <TableCell className={cellClass}>
                  <Link
                    href={`/balance/${day.date}`}
                    className="text-primary underline underline-offset-4"
                    aria-current={day.date === selectedDate ? "date" : undefined}
                  >
                    {dayLabel(day.date)}
                  </Link>
                </TableCell>
                {day.logged ? (
                  <>
                    <TableCell className={numClass}>{whole(day.eatenKcal)}</TableCell>
                    <TableCell className={numClass}>{whole(day.expenditureKcal)}</TableCell>
                    <TableCell className={numClass}>{signedWhole(day.balanceKcal)}</TableCell>
                    <TableCell className={numClass}>{signedKg(day.weightChangeKg)}</TableCell>
                    <TableCell className={cellClass}>
                      <BalanceStatusLabel balanceKcal={day.balanceKcal} />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className={numClass}>—</TableCell>
                    <TableCell className={numClass}>—</TableCell>
                    <TableCell className={numClass}>—</TableCell>
                    <TableCell className={numClass}>—</TableCell>
                    <TableCell className={`${cellClass} text-muted-foreground`}>{t("week.notLogged")}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
          {/* D6: totals cover logged days only. */}
          <TableFooter className="bg-transparent">
            <TableRow className={`${rowClass} font-hand text-lg shadow-[inset_0_2px_0_var(--color-steel-blue-600)]`}>
              <TableCell className={cellClass}>{t("week.total")}</TableCell>
              <TableCell className={numClass}>{whole(total.eatenKcal)}</TableCell>
              <TableCell className={numClass}>{whole(total.expenditureKcal)}</TableCell>
              <TableCell className={numClass}>{signedWhole(total.balanceKcal)}</TableCell>
              <TableCell className={numClass}>{signedKg(total.weightChangeKg)}</TableCell>
              <TableCell className={cellClass}>
                <span className="mr-3 text-muted-foreground">
                  {t("week.loggedDays", { count: total.loggedDays })}
                </span>
                {total.loggedDays > 0 ? <BalanceStatusLabel balanceKcal={total.balanceKcal} /> : null}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
