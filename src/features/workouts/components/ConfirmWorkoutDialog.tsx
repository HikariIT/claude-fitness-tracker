"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { WorkoutDetails } from "@/server/dal/workouts";
import { deleteWorkoutAction } from "@/features/workouts/actions";
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

type ConfirmWorkoutDialogProps = {
  target: { workout: WorkoutDetails; name: string } | null; // null = closed; name is the display name
  onOpenChange: (open: boolean) => void;
};

export function ConfirmWorkoutDialog({ target, onOpenChange }: ConfirmWorkoutDialogProps) {
  const t = useTranslations("workouts");
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    if (!target) return;
    const { workout } = target;
    startTransition(async () => {
      const result = await deleteWorkoutAction(workout.id);
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
            {target ? t("confirmDelete.description", { name: target.name }) : null}
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
