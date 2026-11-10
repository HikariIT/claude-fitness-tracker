# 5. Documentation (navigators, architecture doc)
**Decisions:** D1, D2, D3, D5, D6, D7, D9

Goal: bring the navigator docs up to date with the finished foods view. Edit the docs only, no code. Keep each navigator short (≤ ~40 lines), and match the existing tone (short bullets, file → purpose).

Changes:
- `src/features/CLAUDE.md`: under **Slices**, add `foods/`: `FoodsSection` (async server component, `await connection()`, reads `listFoods`), `FoodsView` (client: search, show-archived toggle, dialogs), `FoodsTable`, `FoodFormDialog` (add/edit, `useActionState(saveFood)`, live kcal-from-macros hint), `ArchiveFoodDialog`, `actions.ts` (`saveFood`, `archiveFoodAction`, `restoreFoodAction`). Remove `foods/` from the "planned, not built yet" line.
- `src/server/CLAUDE.md`: add `dal/foods.ts` (`listFoods()`, returns archived rows too) and `services/foods.ts` (`createFood`, `updateFood`, `archiveFood`, `restoreFood` return `{ ok } | { ok: false, reason: "nameTaken" | "notFound" }`; case-insensitive name uniqueness among non-archived foods, D6/D9). Add the cache tag `foods` to **Cache tags**.
- `src/lib/CLAUDE.md`: add `numbers.ts` (`parseDecimal`, shared by validators), `search.ts` (`normalizeForSearch`, `matchesQuery`: case- and diacritics-insensitive, `ł`→`l`), `nutrition.ts` now also has `kcalFromMacros` (4/4/9), and `validation/foods.ts` (`parseFoodForm`, `parseFoodId`, `FOOD_ERROR_CODES`; `macros` pseudo-field for `macrosSum`).
- `src/app/CLAUDE.md`: change the `[locale]/foods/page.tsx` line from placeholder to: food database, async `FoodsSection` in `<Suspense>`.
- `CLAUDE_ARCHITECTURE.md`:
  - Tree: in `features/foods/components/`, replace the comment with `FoodsView, FoodsTable, FoodFormDialog, ArchiveFoodDialog` and `actions.ts` with `saveFood, archiveFoodAction, restoreFoodAction` (mark `(exists)`). Mention `dal/foods.ts` and `services/foods.ts` in the `server/` lines, and `search.ts` / `numbers.ts` under `lib/`.
  - Data model, **foods**: keep "Foods made from other foods come in a later task" (D1). Add that names are unique among non-archived foods ignoring case (enforced in the service, not the DB) and that macros sum to ≤ 100 g.
  - Setup step 6: mark foods done (FIT-11).

**Files:**
- Modify: `src/features/CLAUDE.md`, `src/server/CLAUDE.md`, `src/lib/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`

**Read:** the five files above, and `src/features/foods/actions.ts`, `src/server/services/foods.ts` (exports only, to confirm the names)

**Verify:** `npm run lint && npm test`
