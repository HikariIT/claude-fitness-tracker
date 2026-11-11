"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import type { Exercise, WorkoutDetails } from "@/server/dal/workouts";
import { groupConsecutiveSets, treadmillDistanceKm } from "@/lib/workouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WorkoutCardProps = {
  workout: WorkoutDetails;
  exercisesById: Map<number, Exercise>;
  onEdit: (workout: WorkoutDetails) => void;
  onDelete: (workout: WorkoutDetails, name: string) => void;
};

/** Display name: training → workout.name ?? t("types.training"); treadmill → t("types.treadmill"). */
export function workoutDisplayName(
  workout: WorkoutDetails,
  t: (key: "types.treadmill" | "types.training") => string,
): string {
  if (workout.type === "training") return workout.name ?? t("types.training");
  return t("types.treadmill");
}

// Same icon-button styling as EntriesTable: one 36px line, no padding.
const actionClass = "size-7 text-steel-blue-300 hover:bg-icy-blue-800 hover:text-primary";

export function WorkoutCard({ workout, exercisesById, onEdit, onDelete }: WorkoutCardProps) {
  const t = useTranslations("workouts");
  const format = useFormatter();
  const num = (value: number, maximumFractionDigits: number) =>
    format.number(value, { maximumFractionDigits });

  const name = workoutDisplayName(workout, t);
  const session = workout.treadmillSession;
  const groups = workout.type === "training" ? groupConsecutiveSets(workout.sets) : [];

  return (
    // Notebook ruling: every line is h-9 and there is no vertical padding or border,
    // so the card is a whole number of 36px lines. A ring instead of a border adds no height.
    <article className="rounded-xl bg-platinum-900 px-4 shadow-sm ring-1 ring-border">
      <header className="flex h-9 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="outline">{t(`types.${workout.type}`)}</Badge>
          {workout.type === "training" && workout.name ? (
            <span className="truncate font-semibold text-primary">{workout.name}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {workout.kcalBurned !== null ? (
            <span className="font-hand text-xl text-primary tabular-nums">
              {t("card.kcal", { kcal: num(workout.kcalBurned, 0) })}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className={actionClass}
            aria-label={t("actions.edit", { name })}
            onClick={() => onEdit(workout)}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${actionClass} hover:bg-destructive/10 hover:text-destructive`}
            aria-label={t("actions.delete", { name })}
            onClick={() => onDelete(workout, name)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </header>

      {session ? (
        <p className="h-9 truncate leading-9">
          {t("card.treadmillSummary", {
            duration: num(session.durationMin, 1),
            speed: num(session.speedKmh, 1),
            incline: num(session.inclinePct, 1),
            distance: format.number(
              treadmillDistanceKm(session.speedKmh, session.durationMin),
              { maximumFractionDigits: 2 },
            ),
          })}
        </p>
      ) : null}

      {groups.length > 0 ? (
        <ul className="grid">
          {groups.map((group) => (
            <li key={`${group.exerciseId}-${group.sets[0].order}`} className="h-9 truncate leading-9">
              {t("card.setLine", {
                exercise: exercisesById.get(group.exerciseId)?.name ?? "—",
                sets: group.sets
                  .map((set) =>
                    set.weightKg === null
                      ? t("card.setNoWeight", { reps: set.reps })
                      : t("card.setWithWeight", {
                          reps: set.reps,
                          weight: num(set.weightKg, 2),
                        }),
                  )
                  .join(", "),
              })}
            </li>
          ))}
        </ul>
      ) : null}

      {workout.notes ? (
        <p className="h-9 truncate italic leading-9 text-muted-foreground">{workout.notes}</p>
      ) : null}
    </article>
  );
}
