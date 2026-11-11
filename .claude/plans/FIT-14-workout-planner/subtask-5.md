# 5. Workouts view, steps card, burned totals, routes and docs
**Decisions:** D1, D2, D4, D7, D8, D10

Compose the page: a server section that loads the day, a client view with the list, steps and totals, the two routes, and the docs.

## Already in place
```ts
// @/server/dal/workouts
export async function getWorkoutDay(date: string): Promise<WorkoutDetails[]>; // ascending id
export async function getDailySteps(date: string): Promise<DailySteps | null>;
export async function listExercises(): Promise<Exercise[]>;
// @/server/dal/settings
export async function getSettings(): Promise<Settings | null>; // Settings.weightKg: number
// @/lib/dates: isIsoDate(v), localIsoDate(now: Date)
// @/lib/workouts
export function sumBurned(workouts: readonly { kcalBurned: number | null }[], steps: { kcal: number } | null): { workouts: number; steps: number; total: number };
// @/components/data/DatePager: <DatePager date={date} basePath="/workouts" />  (basePath union already includes "/workouts")
// @/components/data/StatCard: <StatCard label value unit? maximumFractionDigits? className? />
// @/components/layout/EmptyState: <EmptyState icon={LucideIcon} title description />
// features/workouts/components (subtasks 3–4):
//   TreadmillFormDialog { open, onOpenChange, date, workout: WorkoutDetails | null, weightKg: number | null }
//   TrainingFormDialog  { open, onOpenChange, date, workout: WorkoutDetails | null, exercises: Exercise[] }
//   StepsFormDialog     { open, onOpenChange, date, steps: DailySteps | null, weightKg: number | null }
//   ConfirmWorkoutDialog { target: { workout: WorkoutDetails; name: string } | null, onOpenChange }
//   WorkoutCard { workout, exercisesById: Map<number, Exercise>, onEdit(workout), onDelete(workout, name) }
//   workoutDisplayName(workout, t): string
```
Message keys (namespace `workouts`): `list.title`, `empty.title|description`, `actions.addTreadmill|addTraining|editSteps`, `steps.title|empty|summary {steps kcal}`, `totals.title|workouts|steps|total`, `units.kcal`, `types.*`. Page keys: `pages.workouts.title|description` (already exist).

## `src/features/workouts/components/WorkoutsSection.tsx` (new, server)
Copy `src/features/planner/components/PlannerSection.tsx`:
```ts
/** `dateParam` undefined = today. */
export async function WorkoutsSection({ dateParam }: { dateParam?: Promise<string> }): Promise<JSX.Element>;
```
It calls `await connection()`, then gets the date (or `localIsoDate(new Date())`). `!isIsoDate` → `notFound()` (D1). It runs `Promise.all([getWorkoutDay(date), getDailySteps(date), listExercises(), getSettings()])`, then renders `<WorkoutsView date workouts steps exercises weightKg={settings?.weightKg ?? null} />`.

## `src/features/workouts/components/WorkoutsView.tsx` (new, client)
Follow `src/features/planner/components/PlannerView.tsx` (a `space-y-9` root, every block on the 36px ruling).
```ts
type WorkoutsViewProps = {
  date: string; workouts: WorkoutDetails[]; steps: DailySteps | null;
  exercises: Exercise[]; weightKg: number | null;
};
```
State: `formType: "treadmill" | "training" | null` (which dialog is open), `editing: WorkoutDetails | null`, `deleting: { workout; name } | null`, `stepsOpen: boolean`.
Blocks, in order:
1. `<DatePager date={date} basePath="/workouts" />`.
2. `<section aria-labelledby="workouts-title">`: one `h-9` line with the `h2` `list.title` (`font-hand text-2xl leading-9 text-primary`) and, on the right, two buttons with a `Plus` icon: `actions.addTreadmill` and `actions.addTraining`. Each opens its dialog with `editing = null`. Below: when empty, `EmptyState` (icon `Dumbbell`, `empty.title`, `empty.description`). Otherwise a `grid gap-y-9` of `WorkoutCard`s in the given order (D2). `onEdit` sets `editing` and `formType = workout.type` (D8: the dialog is picked by the stored type). `onDelete` sets `deleting`.
3. `<StepsCard steps={steps} onEdit={() => setStepsOpen(true)} />`.
4. `<BurnedTotals totals={sumBurned(workouts, steps)} />` (D10).
5. The dialogs: `TreadmillFormDialog` (open when `formType === "treadmill"`), `TrainingFormDialog` (open when `formType === "training"`). Their `onOpenChange(false)` sets `formType = null`. Also `StepsFormDialog` and `ConfirmWorkoutDialog`. Build `exercisesById` with `useMemo`.

## `src/features/workouts/components/StepsCard.tsx` (new, client)
```ts
type StepsCardProps = { steps: DailySteps | null; onEdit: () => void };
```
A `<section aria-labelledby="steps-title">` with an `h-9` line: `h2` `steps.title` on the left and an outline `actions.editSteps` button (`Footprints` icon) on the right. Below it is one `h-9 leading-9` line: `steps.summary` with `format.number` values when `steps !== null`, otherwise `steps.empty` in `text-muted-foreground` (D7).

## `src/features/workouts/components/BurnedTotals.tsx` (new, client)
```ts
type BurnedTotalsProps = { totals: { workouts: number; steps: number; total: number } };
```
Copy the stat-card block of `src/features/planner/components/DayTotals.tsx` (lines with `mt-9 grid … gap-y-9`, `StatCard className="min-h-27 py-3"`). It has an `h2` `totals.title` and a `grid-cols-1 sm:grid-cols-3` grid with `totals.workouts`, `totals.steps` and `totals.total`, all with unit `units.kcal`. There are no goal lines (D10).

## Routes
- `src/app/[locale]/workouts/page.tsx` (modify): replace the `EmptyState` placeholder with the planner pattern from `src/app/[locale]/planner/page.tsx`: `PageHeader`, then `<Suspense fallback={null}><WorkoutsSection /></Suspense>`. Keep `generateMetadata`. Remove the now-unused `Dumbbell`, `EmptyState` and `common` imports.
- `src/app/[locale]/workouts/[date]/page.tsx` (new): copy `src/app/[locale]/planner/[date]/page.tsx`. Use `PageProps<"/[locale]/workouts/[date]">`, the `pages.workouts` namespace and `<WorkoutsSection dateParam={Promise.resolve(date)} />`. Use no `generateStaticParams` (any ISO date is valid, D1). The `PageProps` route type is generated by `next dev`/`next build`. If `tsc` complains that the route is unknown, run `npx next typegen` first.

## Docs
- `src/features/CLAUDE.md`: replace "`workouts/`, `balance/`: planned" with a `workouts/` bullet (WorkoutsSection, WorkoutsView, WorkoutCard, TreadmillFormDialog with the ACSM estimate, TrainingFormDialog + ExercisePicker with inline exercise creation, StepsCard + StepsFormDialog, BurnedTotals, ConfirmWorkoutDialog, and actions `saveWorkout`, `deleteWorkoutAction`, `saveSteps`, `clearStepsAction`). Keep `balance/` as planned.
- `src/app/CLAUDE.md`: in the route map, mark `workouts/page.tsx` as built and add `workouts/[date]/page.tsx` (any ISO day, invalid → 404).
- `CLAUDE_ARCHITECTURE.md`: in the directory tree, change `workouts/page.tsx # Workout planner (placeholder)` to describe the built page and add the `workouts/[date]` line. Update the `features/workouts/` line with the component names and actions. Add `dal: getWorkoutDay, getDailySteps, listExercises` to the `server/dal` comment and `workouts.ts` to the `lib/` list. In **Data model**, drop `distanceKm?` from treadmill_sessions and add a **daily_steps** bullet (`date` unique, `steps`, `kcal`, kcal prefilled from `steps × weightKg × 0.0005`). Add "workouts FIT-14" to setup step 6.

**Files:**
- Create: `src/features/workouts/components/WorkoutsSection.tsx`, `WorkoutsView.tsx`, `StepsCard.tsx`, `BurnedTotals.tsx`
- Modify: `src/app/[locale]/workouts/page.tsx`
- Create: `src/app/[locale]/workouts/[date]/page.tsx`
- Modify: `src/features/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`

**Read:** `src/features/planner/components/PlannerSection.tsx`, `src/features/planner/components/PlannerView.tsx`, `src/features/planner/components/DayTotals.tsx:1-40`, `src/app/[locale]/planner/page.tsx`, `src/app/[locale]/planner/[date]/page.tsx`, `src/app/[locale]/workouts/page.tsx`, `src/features/workouts/components/WorkoutCard.tsx:1-30` (props and `workoutDisplayName`), `src/features/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm test && npm run build`
