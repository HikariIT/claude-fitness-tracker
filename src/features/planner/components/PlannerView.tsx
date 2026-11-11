"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Utensils } from "lucide-react";
import type { Food, FoodPortion } from "@/server/dal/foods";
import type { DiaryEntry } from "@/server/dal/diary";
import { defaultMeal, sumNutrition } from "@/lib/diary";
import { DatePager } from "@/components/data/DatePager";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmEntryDialog } from "./ConfirmEntryDialog";
import { DayTotals, type DayGoals } from "./DayTotals";
import { EntriesTable } from "./EntriesTable";
import { EntryFormDialog } from "./EntryFormDialog";

type PlannerViewProps = {
  date: string; // YYYY-MM-DD
  entries: DiaryEntry[]; // ascending id (D13)
  foods: Food[]; // all foods incl. archived
  portions: FoodPortion[]; // every food's portions, sortOrder within a food
  goals: DayGoals;
};

export function PlannerView({ date, entries, foods, portions, goals }: PlannerViewProps) {
  const t = useTranslations("planner");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [deleting, setDeleting] = useState<{ entry: DiaryEntry; foodName: string } | null>(null);

  const foodsById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const totals = useMemo(() => sumNutrition(entries), [entries]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (entry: DiaryEntry) => {
    setEditing(entry);
    setFormOpen(true);
  };
  const openDelete = (entry: DiaryEntry, foodName: string) => setDeleting({ entry, foodName });

  return (
    // Every block is a whole number of 36px ruled lines and blocks sit one line apart.
    <div className="space-y-9">
      <DatePager date={date} basePath="/planner" />

      <section aria-labelledby="entries-title">
        <div className="flex h-9 items-center justify-between gap-4">
          <h2 id="entries-title" className="font-hand text-2xl leading-9 text-primary">
            {t("list.title")}
          </h2>
          <Button onClick={openAdd}>
            <Plus aria-hidden="true" />
            {t("actions.add")}
          </Button>
        </div>
        <div>
          {entries.length === 0 ? (
            <EmptyState icon={Utensils} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <EntriesTable entries={entries} foodsById={foodsById} onEdit={openEdit} onDelete={openDelete} />
          )}
        </div>
      </section>

      <DayTotals totals={totals} goals={goals} />

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        date={date}
        foods={foods}
        portions={portions}
        entry={editing}
        defaultMeal={defaultMeal(entries)}
      />
      <ConfirmEntryDialog
        target={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}
