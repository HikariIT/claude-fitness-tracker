# 4. ProfileForm feature UI and the `/profile` page
**Decisions:** D1, D2, D3, D4, D5, D6, D7, D8

Goal: replace the placeholder `/profile` page with the real form plus live BMR/TDEE results. Read the Next docs listed under **Read** first (Next 16, `cacheComponents` is on).

Available from earlier subtasks (do not redefine):
- `@/lib/nutrition`: `SEXES`, `ACTIVITY_LEVELS`, `Sex`, `ActivityLevel`, `ageOn(birth, today)`, `calcBmr({sex, weightKg, heightCm, age})`, `calcTdee(bmr, level)`.
- `@/lib/validation/profile`: `ProfileErrorCode`, `ProfileField`.
- `@/lib/dates`: `isIsoDate`.
- `@/server/dal/settings`: `getSettings(): Promise<Settings | null>` and `type Settings` (fields `sex, birthDate, heightCm, weightKg, activityLevel, kcalGoal, proteinGoalG: number | null`).
- `@/features/profile/actions`: `saveProfile(prev, formData)` and `type ProfileActionState = ActionResult<{savedAt:number}, ProfileErrorCode> | null` (`ActionResult` is `{ok:true;data}|{ok:false;code:"validation"|"unexpected";fieldErrors?}`).
- `@/components/forms/{FormField,NumberInput,SubmitButton}`: `FormField({id,label,hint?,error?,children})`, `NumberInput({value:string,onChange:(v:string)=>void,unit?,...inputProps})`, `SubmitButton({children,pendingLabel})`.
- `@/components/data/StatCard({label, value:number, unit?, hint?, maximumFractionDigits?})`.
- shadcn: `Select, SelectTrigger, SelectValue, SelectContent, SelectItem` (`@/components/ui/select`), `Input`, `Button`, `Card`.
- Message namespace `profile` (`fields.*`, `units.*`, `sex.*`, `activity.*`, `results.*`, `actions.*`, `toast.*`, `errors.*`) and `pages.profile.title|description`.
- `toast` from `sonner` (Toaster is already mounted in the layout).

## `src/features/profile/components/ProfileForm.tsx` (`"use client"`)
```ts
type ProfileFormProps = { initial: Settings | null; today: string };
```
- `const t = useTranslations("profile")`; `const [state, formAction] = useActionState(saveProfile, null)`.
- Controlled state, all strings: `sex` (`initial?.sex ?? ""`), `birthDate` (`initial?.birthDate ?? ""`), `heightCm`, `weightKg` (`String(initial.heightCm)` or `""`), `activityLevel` (`initial?.activityLevel ?? "moderate"`), `proteinGoalG` (`initial?.proteinGoalG` → string or `""`), and `kcalGoal` + `goalTouched: boolean` (starts `Boolean(initial)`; value shown = `goalTouched ? kcalGoal : prefill`, where `prefill = tdee ? String(Math.round(tdee)) : ""`, D2). Typing in the goal input sets `goalTouched = true`. The "use as goal" button sets `kcalGoal = String(Math.round(tdee))` and `goalTouched = true`.
- Live results (D1, D5): parse `heightCm`/`weightKg` with `Number(value.replace(",", "."))`. If `sex` is set, `isIsoDate(birthDate)`, `birthDate <= today`, height and weight are finite and > 0, then `age = ageOn(birthDate, today)`, `bmr = calcBmr(...)`, `tdee = calcTdee(bmr, activityLevel)`. Otherwise results are `null` and the results panel shows `t("results.incomplete")`. Do NOT call `new Date()` in this component: `today` comes from props.
- Fields (each in `FormField`, ids like `profile-sex`, error text from `state.fieldErrors?.[field]` via `t(`errors.${code}`)`; set `aria-invalid` and `aria-describedby` on the control when there is an error):
  - `sex`: shadcn `Select` over `SEXES` (item label `t(`sex.${s}`)`) + `<input type="hidden" name="sex" value={sex} />`.
  - `birthDate`: `<Input type="date" name="birthDate" max={today} />`.
  - `heightCm`, `weightKg`: `NumberInput` with `name`, `unit={t("units.cm")}` / `t("units.kg")`.
  - `activityLevel`: `Select` over `ACTIVITY_LEVELS` (label `t(`activity.${level}`)`) + hidden input `name="activityLevel"`.
  - `kcalGoal`: `NumberInput` `name="kcalGoal"`, `unit={t("units.kcal")}`, plus a small `Button type="button" variant="outline" size="sm"` "use as goal" (disabled when `tdee` is null).
  - `proteinGoalG`: `NumberInput` `name="proteinGoalG"`, `unit={t("units.g")}`.
- Footer: `<SubmitButton pendingLabel={t("actions.saving")}>{t("actions.save")}</SubmitButton>`.
- Toast (D3): `useEffect` on `state`: if `state?.ok` → `toast.success(t("toast.saved"))`; if `state && !state.ok && state.code === "unexpected"` → `toast.error(t("toast.failed"))`. Validation errors show inline only.
- Layout: `<form action={formAction}>` in a two-column grid on `lg` (form fields left, results right), one column on mobile. Results panel: heading `t("results.title")` (`font-hand text-2xl text-primary`), then `StatCard`s: age (`unit={t("results.years")}`), BMR (`label={t("results.bmr")}`, `hint={t("results.bmrHint")}`, `unit={t("units.kcal")}`), TDEE (`t("results.tdee")`, `t("results.tdeeHint")`). `StatCard` formats numbers with `maximumFractionDigits=0`.

## `src/app/[locale]/profile/page.tsx`
Keep `generateMetadata` and the `setRequestLocale` call. The page renders `<PageHeader …/>` then `<Suspense fallback={null}><ProfileSection /></Suspense>`. `ProfileSection` is an async server component defined in the same file (or `src/features/profile/components/ProfileSection.tsx`; pages stay thin, so prefer the latter): `await connection()` (`import { connection } from "next/server"`; confirm the API in the docs), then compute `today` (local ISO date from `new Date()`), `const initial = await getSettings()`, and render `<ProfileForm initial={initial} today={today} />`. Remove the unused `EmptyState`, `User` and `common` imports. The page must not import `@/db/*`.

**Files:**
- Create: `src/features/profile/components/ProfileForm.tsx`
- Create: `src/features/profile/components/ProfileSection.tsx`
- Modify: `src/app/[locale]/profile/page.tsx`: replace the placeholder body

**Read:** `src/app/[locale]/profile/page.tsx`, `src/features/profile/actions.ts`, `src/components/forms/FormField.tsx`, `src/components/forms/NumberInput.tsx`, `src/components/ui/select.tsx` (exports at the bottom, props follow Radix Select), `src/components/data/StatCard.tsx`, `src/messages/en.json` (`profile` object), `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md` and `node_modules/next/dist/docs/01-app/02-guides/forms.md` (if a path is missing, `Glob` `node_modules/next/dist/docs/**/connection*`)

**Verify:** `npx tsc --noEmit && npm run lint && npm test && npm run build`
(`npm run build` needs `DATABASE_URL` from `.env.local` and a migrated database: run `npm run db:migrate` first. If the build cannot reach the database, say so in your final note and rely on tsc + lint.)
