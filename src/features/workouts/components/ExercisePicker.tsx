"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { Exercise } from "@/server/dal/workouts";
import { matchesQuery, normalizeForSearch } from "@/lib/search";
import { EXERCISE_NAME_MAX } from "@/lib/validation/workouts";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Either an existing exercise (D6) or a name to create on save. Both null = not chosen. */
export type ExerciseChoice = { exerciseId: number | null; newName: string | null };

type ExercisePickerProps = {
  id: string; // input id, used by FormField's label
  exercises: Exercise[]; // all, incl. archived
  value: ExerciseChoice;
  onChange: (value: ExerciseChoice) => void;
  invalid?: boolean;
};

const nameCollator = new Intl.Collator("pl", { sensitivity: "base" });
const MAX_CANDIDATES = 6;

export function ExercisePicker({ id, exercises, value, onChange, invalid }: ExercisePickerProps) {
  const t = useTranslations("workouts");
  const [query, setQuery] = useState("");

  const hasChoice = value.exerciseId !== null || value.newName !== null;
  if (hasChoice) {
    const name =
      value.exerciseId !== null
        ? (exercises.find((e) => e.id === value.exerciseId)?.name ?? "—")
        : (value.newName ?? "");
    return (
      <div className="flex h-9 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{name}</span>
          {value.newName !== null ? (
            <Badge variant="outline">{t("exercise.newBadge")}</Badge>
          ) : null}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ exerciseId: null, newName: null })}
        >
          {t("exercise.change")}
        </Button>
      </div>
    );
  }

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeForSearch(trimmedQuery);
  // An archived exercise is offered only as an exact match: the server reuses archived names (D6).
  const candidates =
    trimmedQuery === ""
      ? []
      : exercises
          .filter(
            (e) =>
              (e.archivedAt === null || normalizeForSearch(e.name) === normalizedQuery) &&
              matchesQuery(e.name, trimmedQuery),
          )
          .sort((a, b) => nameCollator.compare(a.name, b.name))
          .slice(0, MAX_CANDIDATES);

  const newName = trimmedQuery.replace(/\s+/g, " ");
  const hasExactMatch = exercises.some((e) => normalizeForSearch(e.name) === normalizedQuery);
  const canCreate =
    trimmedQuery !== "" && !hasExactMatch && newName.length <= EXERCISE_NAME_MAX;
  const tooLong = trimmedQuery !== "" && !hasExactMatch && newName.length > EXERCISE_NAME_MAX;

  const pick = (choice: ExerciseChoice) => {
    onChange(choice);
    setQuery("");
  };

  return (
    <div className="grid">
      <Input
        id={id}
        type="search"
        placeholder={t("exercise.searchPlaceholder")}
        aria-label={t("exercise.searchLabel")}
        aria-invalid={invalid ? true : undefined}
        className={fieldControlClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // Enter picks nothing here; it must not submit the training form.
          if (e.key === "Enter") e.preventDefault();
        }}
      />

      {candidates.length > 0 || canCreate ? (
        <ul className="grid">
          {candidates.map((e) => (
            <li key={e.id}>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => pick({ exerciseId: e.id, newName: null })}
              >
                <Plus aria-hidden="true" />
                {e.name}
              </Button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => pick({ exerciseId: null, newName })}
              >
                <Plus aria-hidden="true" />
                {t("exercise.create", { name: newName })}
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {tooLong ? (
        <p className="text-sm leading-9 text-destructive">{t("errors.setExerciseNameTooLong")}</p>
      ) : null}
    </div>
  );
}
