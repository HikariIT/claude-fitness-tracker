"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { Food } from "@/server/dal/foods";
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

type FoodsTableProps = {
  foods: Food[]; // already filtered and sorted
  pendingId: number | null; // disables that row's buttons
  onEdit: (food: Food) => void;
  onArchive: (food: Food) => void;
  onRestore: (food: Food) => void;
  onDelete: (food: Food) => void; // permanent delete, archived rows only
};

// Every row is exactly one ruled line of the notebook sheet (h-9 = --paper-line-gap) and draws no
// border of its own: the paper's ruling is the row divider. A 1px row border or the shadcn default
// padding (p-2 + h-8 buttons ≈ 49px) would drift off the 36px ruling and let lines cut through text.
const rowClass = "border-0 hover:bg-icy-blue-900/70";
const headClass =
  "h-9 py-0 font-hand text-lg font-normal text-primary shadow-[inset_0_-2px_0_var(--color-steel-blue-600)]";
const cellClass = "h-9 py-0";
const numClass = `${cellClass} text-right tabular-nums`;
// h-7 keeps the row at one line; ghost hover tint matches the row hover.
const actionClass = "h-7 text-steel-blue-300 hover:bg-icy-blue-800 hover:text-primary";

export function FoodsTable({
  foods,
  pendingId,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: FoodsTableProps) {
  const t = useTranslations("foods");
  const format = useFormatter();
  const num = (value: number) => format.number(value, { maximumFractionDigits: 1 });

  return (
    <Table className="text-base">
      <TableHeader className="[&_tr]:border-0">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead className={headClass}>{t("columns.name")}</TableHead>
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
        {foods.map((food) => {
          const archived = food.archivedAt !== null;
          const busy = pendingId === food.id;
          return (
            <TableRow key={food.id} className={rowClass}>
              <TableCell
                className={`${cellClass} ${archived ? "text-muted-foreground" : "font-semibold text-primary"}`}
              >
                <span className="inline-flex items-center gap-2">
                  {food.name}
                  {archived ? (
                    <Badge variant="outline" className="bg-white">
                      {t("archivedBadge")}
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className={numClass}>{num(food.kcal)}</TableCell>
              <TableCell className={numClass}>{num(food.proteinG)}</TableCell>
              <TableCell className={numClass}>{num(food.carbsG)}</TableCell>
              <TableCell className={numClass}>{num(food.fatG)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>
                {archived ? (
                  <span className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={actionClass}
                      disabled={busy}
                      onClick={() => onRestore(food)}
                    >
                      <RotateCcw aria-hidden="true" />
                      {t("actions.restore")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${actionClass} text-destructive hover:bg-destructive/10 hover:text-destructive`}
                      disabled={busy}
                      onClick={() => onDelete(food)}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("actions.delete")}
                    </Button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={actionClass}
                      disabled={busy}
                      onClick={() => onEdit(food)}
                    >
                      <Pencil aria-hidden="true" />
                      {t("actions.edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={actionClass}
                      disabled={busy}
                      onClick={() => onArchive(food)}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("actions.archive")}
                    </Button>
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
