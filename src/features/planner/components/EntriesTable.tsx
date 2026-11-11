"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import type { Food } from "@/server/dal/foods";
import type { DiaryEntry } from "@/server/dal/diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EntriesTableProps = {
  entries: DiaryEntry[]; // one table for the whole day, insertion order (D13)
  foodsById: Map<number, Food>;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry, foodName: string) => void;
};

// Same notebook-ruling row styling as FoodsTable: one 36px line per row, no row borders.
const rowClass = "border-0 hover:bg-icy-blue-900/70";
const headClass =
  "h-9 py-0 font-hand text-lg font-normal text-primary shadow-[inset_0_-2px_0_var(--color-steel-blue-600)]";
const cellClass = "h-9 py-0";
const numClass = `${cellClass} text-right tabular-nums`;
const actionClass = "size-7 text-steel-blue-300 hover:bg-icy-blue-800 hover:text-primary";

export function EntriesTable({ entries, foodsById, onEdit, onDelete }: EntriesTableProps) {
  const t = useTranslations("planner");
  const format = useFormatter();
  const num = (value: number) => format.number(value, { maximumFractionDigits: 1 });

  return (
    <Table className="text-base">
      <TableHeader className="[&_tr]:border-0">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead className={headClass}>{t("columns.meal")}</TableHead>
          <TableHead className={headClass}>{t("columns.food")}</TableHead>
          <TableHead className={`${headClass} text-right`}>{t("columns.quantity")}</TableHead>
          <TableHead className={`${headClass} text-right`}>
            {t("columns.kcal")} <span className="text-muted-foreground">({t("units.kcal")})</span>
          </TableHead>
          <TableHead className={`${headClass} text-right`}>
            {t("columns.proteinG")} <span className="text-muted-foreground">({t("units.g")})</span>
          </TableHead>
          <TableHead className={`${headClass} text-right`}>
            {t("columns.carbsG")} <span className="text-muted-foreground">({t("units.g")})</span>
          </TableHead>
          <TableHead className={`${headClass} text-right`}>
            {t("columns.fatG")} <span className="text-muted-foreground">({t("units.g")})</span>
          </TableHead>
          <TableHead className={`${headClass} text-right`}>
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const food = foodsById.get(entry.foodId);
          const name = food?.name ?? "—";
          const archived = food?.archivedAt != null; // D7
          return (
            <TableRow key={entry.id} className={rowClass}>
              <TableCell className={`${cellClass} font-hand text-lg text-steel-blue-300`}>
                {t(`meals.${entry.meal}`)}
              </TableCell>
              <TableCell className={`${cellClass} font-semibold text-primary`}>
                <span className="inline-flex items-center gap-2">
                  {name}
                  {archived ? (
                    <Badge variant="outline" className="bg-white">
                      {t("archivedBadge")}
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className={numClass}>{`${num(entry.quantityG)} ${t("units.g")}`}</TableCell>
              <TableCell className={numClass}>
                {format.number(entry.kcal, { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className={numClass}>{num(entry.proteinG)}</TableCell>
              <TableCell className={numClass}>{num(entry.carbsG)}</TableCell>
              <TableCell className={numClass}>{num(entry.fatG)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>
                <span className="inline-flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={actionClass}
                    aria-label={t("actions.edit", { name })}
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${actionClass} hover:bg-destructive/10 hover:text-destructive`}
                    aria-label={t("actions.delete", { name })}
                    onClick={() => onDelete(entry, name)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
