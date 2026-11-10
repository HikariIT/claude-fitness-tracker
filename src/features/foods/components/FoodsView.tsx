"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Apple, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Food } from "@/server/dal/foods";
import { restoreFoodAction } from "@/features/foods/actions";
import { matchesQuery } from "@/lib/search";
import { EmptyState } from "@/components/layout/EmptyState";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodFormDialog } from "./FoodFormDialog";
import { FoodsTable } from "./FoodsTable";
import { ConfirmFoodDialog, type FoodConfirmIntent } from "./ConfirmFoodDialog";

// D5: Polish collation for sorting by name.
const collator = new Intl.Collator("pl", { sensitivity: "base" });

type FoodsViewProps = { foods: Food[] };

export function FoodsView({ foods }: FoodsViewProps) {
  const t = useTranslations("foods");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogFood, setDialogFood] = useState<Food | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    food: Food;
    intent: FoodConfirmIntent;
  } | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const hasActive = useMemo(() => foods.some((f) => f.archivedAt === null), [foods]);

  const visible = useMemo(
    () =>
      foods
        .filter((f) => (showArchived || f.archivedAt === null) && matchesQuery(f.name, query))
        .sort((a, b) => collator.compare(a.name, b.name)),
    [foods, showArchived, query],
  );

  const openAdd = () => {
    setDialogFood(null);
    setDialogOpen(true);
  };
  const openEdit = (food: Food) => {
    setDialogFood(food);
    setDialogOpen(true);
  };

  const restore = (food: Food) => {
    setPendingId(food.id);
    startTransition(async () => {
      const result = await restoreFoodAction(food.id);
      if (result.ok) {
        toast.success(t("toast.restored"));
      } else if (result.fieldErrors?.name === "nameTaken") {
        toast.error(t("toast.nameTaken", { name: food.name }));
      } else {
        toast.error(t("toast.failed"));
      }
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-9">
        <div className="min-w-48 flex-1">
          <Input
            type="search"
            aria-label={t("search.label")}
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={fieldControlClass}
          />
        </div>
        <div className="flex h-9 items-center gap-2">
          <input
            type="checkbox"
            id="foods-show-archived"
            className="size-4 accent-primary"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <Label htmlFor="foods-show-archived">{t("showArchived")}</Label>
        </div>
        <Button onClick={openAdd}>
          <Plus aria-hidden="true" />
          {t("actions.add")}
        </Button>
      </div>

      <p className="text-muted-foreground">{t("per100g")}</p>

      {!hasActive && !showArchived ? (
        <EmptyState icon={Apple} title={t("empty.title")} description={t("empty.description")} />
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">{t("noResults", { query })}</p>
      ) : (
        <FoodsTable
          foods={visible}
          pendingId={pendingId}
          onEdit={openEdit}
          onArchive={(food) => setConfirmTarget({ food, intent: "archive" })}
          onRestore={restore}
          onDelete={(food) => setConfirmTarget({ food, intent: "delete" })}
        />
      )}

      <FoodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} food={dialogFood} />
      <ConfirmFoodDialog
        target={confirmTarget}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      />
    </div>
  );
}
