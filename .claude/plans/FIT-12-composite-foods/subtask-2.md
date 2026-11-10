# 2. Schema: `isComposite`, `finalWeightG`, `food_components`, migration and seed
**Decisions:** D1, D2, D5, D8, D10

Goal: store dishes. A dish is a normal `foods` row with a flag, and its ingredients live in a new table. Schema files use **relative imports only** (drizzle-kit loads them directly, so no `@/` and no `server-only`).

## 1. `src/db/schema/foods.ts` (modify)
Add `boolean`, `index`, `unique` to the `drizzle-orm/pg-core` import. In the `foods` columns, after `fatG`:
```ts
isComposite: boolean().notNull().default(false), // D1, fixed at creation (D8)
finalWeightG: numeric({ precision: 7, scale: 1, mode: "number" }), // D2: dishes only; null = sum of ingredient grams
```
Add a check to the `foods` table: `check("foods_final_weight_positive", sql\`${t.finalWeightG} IS NULL OR ${t.finalWeightG} > 0\`)`.

Add a new table in the same file:
```ts
// Ingredients of a dish (foods.isComposite = true). quantityG = grams of the component in the whole dish.
export const foodComponents = pgTable(
  "food_components",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    foodId: integer().notNull().references(() => foods.id, { onDelete: "cascade" }),
    componentFoodId: integer().notNull().references(() => foods.id, { onDelete: "restrict" }), // D5
    quantityG: numeric({ precision: 7, scale: 1, mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique("food_components_food_component_unique").on(t.foodId, t.componentFoodId),
    index("food_components_component_food_id_idx").on(t.componentFoodId),
    check("food_components_quantity_positive", sql`${t.quantityG} > 0`),
    check("food_components_not_self", sql`${t.foodId} <> ${t.componentFoodId}`),
  ],
);
```

## 2. `src/db/schema/index.ts` (modify)
Import `foodComponents` from `./foods`. Two relations between the same tables need `relationName`:
```ts
export const foodsRelations = relations(foods, ({ many }) => ({
  diaryEntries: many(diaryEntries),
  components: many(foodComponents, { relationName: "composite" }), // ingredients of this dish
  usedIn: many(foodComponents, { relationName: "component" }),     // rows where this food is an ingredient
}));

export const foodComponentsRelations = relations(foodComponents, ({ one }) => ({
  food: one(foods, { fields: [foodComponents.foodId], references: [foods.id], relationName: "composite" }),
  component: one(foods, {
    fields: [foodComponents.componentFoodId],
    references: [foods.id],
    relationName: "component",
  }),
}));
```

## 3. Migration
Run `npm run db:generate`. It creates `src/db/migrations/0001_<name>.sql` and updates `src/db/migrations/meta/`. Check the SQL: `ALTER TABLE "foods" ADD COLUMN "is_composite" boolean DEFAULT false NOT NULL`, `"final_weight_g" numeric(7, 1)`, `CREATE TABLE "food_components"` with both FKs (cascade / restrict), the unique constraint, the index and the checks. Do not edit `0000_*.sql`. Then run `npm run db:migrate` (the Postgres container must be up: `docker compose up -d db`).

## 4. `src/db/seed.ts` (modify) (D10)
- Import `foodComponents` from `@/db/schema` and `compositeNutrition` from `@/lib/composite` (subtask 1: `compositeNutrition(components: { kcal, proteinG, carbsG, fatG, quantityG }[], finalWeightG: number | null): { kcal, proteinG, carbsG, fatG }`).
- Add `food_components` to the `TRUNCATE` list (before `foods` is fine, `CASCADE` is already there).
- Add a constant next to `foodSeed`:
  ```ts
  const dishSeed = {
    name: "Curry z ryżem",
    finalWeightG: null,
    components: [
      { food: "Sos curry", grams: 150 },
      { food: "Ryż gotowany", grams: 200 },
    ],
  } as const;
  ```
- After `foodByName` is built, look up each component (throw `Seed food missing` like the diary code), compute `compositeNutrition(...)`, insert the dish into `foods` with `isComposite: true`, `finalWeightG: null` and the computed values (`.returning()`), then insert two `foodComponents` rows (`foodId: dish.id`, `componentFoodId`, `quantityG`).
- Add checks after the existing rice checks, with the existing `expect(label, actual, expected)` helper:
  - `db.query.foods.findFirst({ where: (f, { eq }) => eq(f.name, "Curry z ryżem"), with: { components: { with: { component: true } } } })`
  - `"dish is composite"` → `true`; `"dish component count"` → `2`; `"dish kcal per 100 g"` → `121.43`; `"dish components are plain foods"` → every `c.component.isComposite === false` is `true`.
  - `db.query.foods.findFirst` for `"Ryż gotowany"` `with: { usedIn: true }` → `"rice used in one dish"`, `usedIn.length` → `1`.
- The existing check "every diary food name is seeded" still passes (the dish is not used in the diary).

## 5. `src/db/schema/CLAUDE.md` (modify)
- In **Files**, change the `foods.ts` bullet to: `foods.ts`: food library, nutrition per 100 g, `archivedAt`, `isComposite`, `finalWeightG`, and `food_components` (dish ingredients: `foodId` cascade, `componentFoodId` restrict, `quantityG`, unique pair).
- In **Rules**, add: A dish is a `foods` row with `isComposite = true`. Its stored per-100 g values are computed from `food_components` by the service (`lib/composite.ts`) and recalculated when an ingredient changes. A food used as an ingredient cannot be hard-deleted (FK `restrict`). Cycles are prevented in the service.

**Files:**
- Modify: `src/db/schema/foods.ts`: new columns and the `foodComponents` table
- Modify: `src/db/schema/index.ts`: relations
- Create: `src/db/migrations/0001_*.sql` and `src/db/migrations/meta/*` (generated by `npm run db:generate`)
- Modify: `src/db/seed.ts`: dish seed and checks
- Modify: `src/db/schema/CLAUDE.md`: docs

**Read:** `src/db/schema/foods.ts`, `src/db/schema/index.ts`, `src/db/schema/diary.ts` (FK/check style), `src/db/seed.ts`, `src/lib/composite.ts` (exports only), `src/db/schema/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm run db:migrate && npm run db:seed`
