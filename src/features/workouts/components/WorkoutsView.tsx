"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dumbbell, Plus } from "lucide-react";
import type { DailySteps, Exercise, WorkoutDetails } from "@/server/dal/workouts";
import { sumBurned } from "@/lib/workouts";
import { DatePager } from "@/components/data/DatePager";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { BurnedTotals } from "./BurnedTotals";
import { ConfirmWorkoutDialog } from "./ConfirmWorkoutDialog";
import { StepsCard } from "./StepsCard";
import { StepsFormDialog } from "./StepsFormDialog";
import { TrainingFormDialog } from "./TrainingFormDialog";
import { TreadmillFormDialog } from "./TreadmillFormDialog";
import { WorkoutCard } from "./WorkoutCard";

type WorkoutsViewProps = {
  date: string; // YYYY-MM-DD
  workouts: WorkoutDetails[]; // ascending id (D2)
  steps: DailySteps | null;
  exercises: Exercise[]; // all, incl. archived
  weightKg: number | null; // profile weight, null = no profile (D4)
};

export function WorkoutsView({ date, workouts, steps, exercises, weightKg }: WorkoutsViewProps) {
  const t = useTranslations("workouts");
  const [formType, setFormType] = useState<"treadmill" | "training" | null>(null);
  const [editing, setEditing] = useState<WorkoutDetails | null>(null);
  const [deleting, setDeleting] = useState<{ workout: WorkoutDetails; name: string } | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const totals = useMemo(() => sumBurned(workouts, steps), [workouts, steps]);

  const openAdd = (type: "treadmill" | "training") => {
    setEditing(null);
    setFormType(type);
  };
  // D8: the dialog is picked by the stored type, since the type cannot change.
  const openEdit = (workout: WorkoutDetails) => {
    setEditing(workout);
    setFormType(workout.type);
  };
  const openDelete = (workout: WorkoutDetails, name: string) => setDeleting({ workout, name });
  const closeForm = (open: boolean) => {
    if (!open) setFormType(null);
  };

  return (
    // Every block is a whole number of 36px ruled lines and blocks sit one line apart.
    <div className="space-y-9">
      <DatePager date={date} basePath="/workouts" />

      <section aria-labelledby="workouts-title">
        <div className="flex h-9 items-center justify-between gap-4">
          <h2 id="workouts-title" className="font-hand text-2xl leading-9 text-primary">
            {t("list.title")}
          </h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => openAdd("treadmill")}>
              <Plus aria-hidden="true" />
              {t("actions.addTreadmill")}
            </Button>
            <Button variant="outline" onClick={() => openAdd("training")}>
              <Plus aria-hidden="true" />
              {t("actions.addTraining")}
            </Button>
          </div>
        </div>
        {/* One ruled line between the heading row and the list. */}
        <div className="mt-9">
          {workouts.length === 0 ? (
            <EmptyState icon={Dumbbell} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <div className="grid gap-y-9">
              {workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  exercisesById={exercisesById}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <StepsCard steps={steps} onEdit={() => setStepsOpen(true)} />

      <BurnedTotals totals={totals} />

      <TreadmillFormDialog
        open={formType === "treadmill"}
        onOpenChange={closeForm}
        date={date}
        workout={editing?.type === "treadmill" ? editing : null}
        weightKg={weightKg}
      />
      <TrainingFormDialog
        open={formType === "training"}
        onOpenChange={closeForm}
        date={date}
        workout={editing?.type === "training" ? editing : null}
        exercises={exercises}
      />
      <StepsFormDialog
        open={stepsOpen}
        onOpenChange={setStepsOpen}
        date={date}
        steps={steps}
        weightKg={weightKg}
      />
      <ConfirmWorkoutDialog
        target={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}
