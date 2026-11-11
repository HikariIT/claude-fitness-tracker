"use client";

import { useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DiaryEntry } from "@/server/dal/diary";
import { deleteDiaryEntryAction } from "@/features/planner/actions";
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

type ConfirmEntryDialogProps = {
  target: { entry: DiaryEntry; foodName: string } | null; // null = closed
  onOpenChange: (open: boolean) => void;
};

export function ConfirmEntryDialog({ target, onOpenChange }: ConfirmEntryDialogProps) {
  const t = useTranslations("planner");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    if (!target) return;
    const { entry } = target;
    startTransition(async () => {
      const result = await deleteDiaryEntryAction(entry.id);
      if (result.ok) {
        toast.success(t("toast.deleted"));
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
          <DialogTitle className="font-hand text-2xl text-primary">
            {t("confirmDelete.title")}
          </DialogTitle>
          <DialogDescription>
            {target
              ? t("confirmDelete.description", {
                  name: target.foodName,
                  grams: format.number(target.entry.quantityG, { maximumFractionDigits: 1 }),
                })
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {t("actions.cancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? t("actions.deleting") : t("actions.confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
