"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Food } from "@/server/dal/foods";
import { archiveFoodAction, deleteFoodAction } from "@/features/foods/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FoodConfirmIntent = "archive" | "delete";

type ConfirmFoodDialogProps = {
  /** null = closed. "archive" hides an active food (D2); "delete" removes an archived food for good. */
  target: { food: Food; intent: FoodConfirmIntent } | null;
  onOpenChange: (open: boolean) => void;
};

export function ConfirmFoodDialog({ target, onOpenChange }: ConfirmFoodDialogProps) {
  const t = useTranslations("foods");
  const [pending, startTransition] = useTransition();
  const intent = target?.intent ?? "archive";
  const copy = intent === "archive" ? "confirmArchive" : "confirmDelete";

  const confirm = () => {
    if (!target) return;
    const { food } = target;
    startTransition(async () => {
      const result =
        intent === "archive" ? await archiveFoodAction(food.id) : await deleteFoodAction(food.id);
      if (result.ok) {
        toast.success(t(intent === "archive" ? "toast.archived" : "toast.deleted"));
        onOpenChange(false);
      } else if (result.fieldErrors?.name === "foodInUse") {
        toast.error(t("toast.inUse", { name: food.name }));
        onOpenChange(false);
      } else if (result.fieldErrors?.name === "foodInComposite") {
        toast.error(t("toast.inComposite", { name: food.name }));
        onOpenChange(false);
      } else {
        toast.error(t("toast.failed"));
      }
    });
  };

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">{t(`${copy}.title`)}</DialogTitle>
          <DialogDescription>
            {target ? t(`${copy}.description`, { name: target.food.name }) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {t("actions.cancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending
              ? t(intent === "archive" ? "confirmArchive.removing" : "confirmDelete.deleting")
              : t(`${copy}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
