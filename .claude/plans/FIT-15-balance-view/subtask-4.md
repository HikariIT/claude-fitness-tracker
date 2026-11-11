# 4. BalanceSection, BalanceView, routes and docs
**Decisions:** D1, D2, D5, D6, D7, D8

Wire the balance page: a server section loads the week, computes it with the pure helpers and renders the client view. Then replace the placeholder route, add the date route and update the docs. Copy the structure of the workouts feature, which follows the same pattern.

## Existing pieces to use (all already exist)
- `src/lib/dates.ts`: `isIsoDate(value)`, `localIsoDate(now: Date)`, `weekDays(iso): string[]` (Mon..Sun).
- `src/lib/balance.ts`: `type BalanceProfile = { sex; birthDate; heightCm; weightKg }`, `dayBalance({ date, profile, diary, workouts, steps }): DayBalance`, `weekBalance(days): WeekBalance`.
- `src/server/dal/diary.ts`: `getDiaryDay(date): Promise<DiaryEntry[]>` (each row has `kcal: number`).
- `src/server/dal/workouts.ts`: `getWorkoutDay(date): Promise<WorkoutDetails[]>` (each has `kcalBurned: number | null`), `getDailySteps(date): Promise<DailySteps | null>` (`kcal: number`).
- `src/server/dal/settings.ts`: `getSettings(): Promise<Settings | null>` (`sex`, `birthDate`, `heightCm`, `weightKg`, …).
- `src/features/balance/components/DaySummary.tsx`: `DaySummary({ day }: { day: DayBalance })`.
- `src/features/balance/components/WeekTable.tsx`: `WeekTable({ days, total, selectedDate }: { days: DayBalance[]; total: WeekBalance; selectedDate: string })`.
- `src/components/data/DatePager.tsx`: `DatePager({ date, basePath })`, which already accepts `basePath="/balance"`.
- `src/components/layout/EmptyState.tsx`: `EmptyState({ title, description?, icon? })`.

## `src/features/balance/components/BalanceSection.tsx` (new, async server component)
Same shape as `src/features/workouts/components/WorkoutsSection.tsx`:
```tsx
export async function BalanceSection({ dateParam }: { dateParam?: Promise<string> }) {
  await connection();
  const date = dateParam ? await dateParam : localIsoDate(new Date());
  if (!isIsoDate(date)) notFound(); // D5
  const settings = await getSettings();
  if (!settings) return <BalanceView date={date} week={null} />; // D7
  const profile: BalanceProfile = { sex: settings.sex, birthDate: settings.birthDate, heightCm: settings.heightCm, weightKg: settings.weightKg };
  // D8: reuse the per-day DAL reads (and their planner:/workouts: tags) for all 7 days in parallel.
  const days = await Promise.all(weekDays(date).map(async (d) => {
    const [diary, workouts, steps] = await Promise.all([getDiaryDay(d), getWorkoutDay(d), getDailySteps(d)]);
    return dayBalance({ date: d, profile, diary, workouts, steps });
  }));
  return <BalanceView date={date} week={{ days, total: weekBalance(days) }} />;
}
```
Imports: `notFound` from `next/navigation`, `connection` from `next/server`.

## `src/features/balance/components/BalanceView.tsx` (new, `"use client"`)
```ts
type BalanceViewProps = { date: string; week: { days: DayBalance[]; total: WeekBalance } | null }; // null = no profile (D7)
```
Render `<div className="space-y-9">`, which keeps every block one 36px ruled line apart:
1. `<DatePager date={date} basePath="/balance" />`.
2. `week === null` (D7): `<EmptyState icon={Scale} title={t("noProfile.title")} description={t("noProfile.description")} />` (`Scale` from `lucide-react`), followed by `<p className="text-center"><Link href="/profile" className="text-primary underline underline-offset-4">{t("noProfile.link")}</Link></p>` (`Link` from `@/i18n/navigation`, `t = useTranslations("balance")`).
3. Otherwise `<DaySummary day={week.days.find((d) => d.date === date)!} />` (the date is always in its own week) and `<WeekTable days={week.days} total={week.total} selectedDate={date} />`.

## Routes
- `src/app/[locale]/balance/page.tsx` (modify): keep `generateMetadata`. Replace the `EmptyState` with `<Suspense fallback={null}><BalanceSection /></Suspense>`, exactly like `src/app/[locale]/workouts/page.tsx`. Remove the now-unused `Scale`, `EmptyState` and `common` imports and translations.
- `src/app/[locale]/balance/[date]/page.tsx` (new): copy `src/app/[locale]/workouts/[date]/page.tsx`, replacing `workouts` with `balance` (`PageProps<"/[locale]/balance/[date]">`, namespace `pages.balance`, `<BalanceSection dateParam={Promise.resolve(date)} />`). No `generateStaticParams`.

## Messages cleanup
The `"common"` namespace (`emptyTitle`, `comingSoon`) was only used by the old placeholder. Remove it from both `src/messages/en.json` and `src/messages/pl.json` (lines 218-221), and fix the surrounding commas. Before deleting, check with Grep that nothing else in `src` uses `"common"`.

## Docs
- `src/features/CLAUDE.md`: replace `- \`balance/\`: planned, not built yet.` with: `balance/`: `BalanceSection` (async server component, date or today, reads `getSettings` and, for the 7 days of the Mon–Sun week, `getDiaryDay`, `getWorkoutDay`, `getDailySteps`; computes with `lib/balance.ts`), `BalanceView` (client: `DatePager`, day summary, week table, or an EmptyState without a profile), `DaySummary`, `WeekTable`, `BalanceStatusLabel`. Read-only, no `actions.ts`.
- `src/app/CLAUDE.md` line 15: change the balance placeholder bullet to `[locale]/balance/page.tsx` (today) and `[locale]/balance/[date]/page.tsx` (any ISO day, invalid → 404), both `BalanceSection` in `Suspense`.
- `CLAUDE_ARCHITECTURE.md`: line 37 → `balance/page.tsx    # Total balance, today (exists: BalanceSection in Suspense)` and add `balance/[date]/page.tsx # Total balance, any ISO day; invalid → 404 (exists)` below it; line 52 → `balance/               # Daily balance and Mon–Sun week (exists: BalanceSection, BalanceView, DaySummary, WeekTable)`; add `balance.ts` to the `lib/` tree (`# Baseline (BMR × 1.2), day/week balance, kg from 7700 kcal (exists)`); in setup step 6 append `, balance FIT-15`.

**Files:**
- Create: `src/features/balance/components/BalanceSection.tsx`
- Create: `src/features/balance/components/BalanceView.tsx`
- Modify: `src/app/[locale]/balance/page.tsx`
- Create: `src/app/[locale]/balance/[date]/page.tsx`
- Modify: `src/messages/en.json`, `src/messages/pl.json`: remove `common`
- Modify: `src/features/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`

**Read:** `src/features/workouts/components/WorkoutsSection.tsx`, `src/app/[locale]/workouts/page.tsx`, `src/app/[locale]/workouts/[date]/page.tsx`, `src/app/[locale]/balance/page.tsx`, `src/messages/en.json:215-225`, `src/messages/pl.json:215-225`, `src/features/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md:30-55,90-101,146`

**Verify:** `npx tsc --noEmit && npm run lint && npm test && npm run build`
