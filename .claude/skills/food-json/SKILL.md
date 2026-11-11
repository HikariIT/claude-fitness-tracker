---
name: food-json
description: Estimate the calories and macros of a meal, product or recipe (from a photo, recipe text, label or description) and return a JSON ready for the Food database "Import JSON" dialog. Use when the user asks how many calories a meal has, or wants foods as JSON to import.
argument-hint: <recipe, description or attached photo>
---

Estimate the nutrition of what the user gives you (a photo, recipe, ingredient list, nutrition label or description) and produce JSON that the app's **Food database → Import JSON** dialog accepts as-is.

Input: $ARGUMENTS (and any attached images).

## 1. Work out the numbers
- **Nutrition label:** use the per-100 g column directly.
- **Recipe or ingredient list:** for each ingredient take the grams used (convert spoons, cups and pieces to grams and say which conversion you used) and its per-100 g values from standard references (e.g. USDA, Polish IŻŻ tables). Sum kcal, protein, carbs and fat for the whole dish. Then divide by the **final cooked weight** and × 100. If the final weight is unknown, estimate it: rice and pasta roughly ×2.5–3 their dry weight, meat loses about 25–30 % when cooked, sauces lose water when reduced. State your assumption.
- **Photo:** identify the components, estimate each one's weight from portion size (plate ~26 cm, fist ~150 g of rice, palm ~100 g of meat) and continue as for a recipe. Say what you see and that portion weights are estimates.
- Raw vs cooked matters. Always say which one the values are for and put it in the name when it is ambiguous (e.g. "Ryż biały gotowany").
- Check: kcal ≈ 4·protein + 4·carbs + 9·fat (alcohol 7, fibre ~2). If the label kcal differs by more than ~10 %, keep the label value and mention it.

## 2. Respect the database rules (the import refuses the whole file otherwise)
Every value is **per 100 g** of the food as eaten:
| Field | Type | Rule |
|---|---|---|
| `name` | string | 1–100 characters after trimming, unique among foods (ignoring case) both in the file and in the existing database |
| `kcal` | number | 0–900 |
| `proteinG` | number | 0–100 |
| `carbsG` | number | 0–100 |
| `fatG` | number | 0–100 |
- `proteinG + carbsG + fatG ≤ 100`. Water, fibre and ash take up the rest, so a sum near 100 is only plausible for oils, sugar or dry powders.
- Round every number to **1 decimal**, because the app rounds to 1 decimal too. Use JSON numbers, not strings.
- At most 100 foods per file. Only plain foods are imported: a recipe becomes **one** food with per-100 g values of the finished dish. If the user wants it as a dish built from existing foods, tell them to use **Add dish** in the app instead.
- Name foods in the user's language (Polish by default; they are bilingual). If a name might already exist in the database, make it more specific (e.g. "Curry z ryżem (domowe)").
- Extra keys are ignored by the importer. Don't add any: keep explanations outside the JSON.

## 3. Answer format
1. A short table of the ingredients or components with grams and kcal, and your assumptions.
2. **The meal itself:** total weight, total kcal and macros for the portion described or shown. This answers "how many calories will this meal have".
3. The importable JSON in one ```json block, exactly in this shape:
```json
{
  "foods": [
    { "name": "Curry z ryżem", "kcal": 145.5, "proteinG": 6.0, "carbsG": 18.0, "fatG": 5.2 }
  ]
}
```
4. One line: "Paste this into Food database → Import JSON (or save it as a `.json` file and load it there). When logging the meal in the planner, enter <N> g for this portion."

If the user asks for a file, write the same JSON to a `.json` file in the place they name and give its path.
