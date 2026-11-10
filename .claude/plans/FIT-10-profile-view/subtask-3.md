# 3. Shared form components and PL/EN message keys
**Decisions:** D4, D7

Goal: add three small feature-agnostic form components and every message key the profile view needs, in both languages. No raw UI strings in components: labels arrive as props. `src/components/` must not import `features/`, `server/` or `db/`. Light mode only; style with palette tokens (`text-primary`, `text-muted-foreground`, `border-border`, `text-destructive` if it exists in `globals.css`, otherwise `text-red-700`).

Context: shadcn primitives `Input` (`@/components/ui/input`), `Label` (`@/components/ui/label`), `Button` (`@/components/ui/button`) exist. `cn()` is in `@/lib/utils`.

## Components (`src/components/forms/`)
1. `FormField.tsx` (server-compatible, no `"use client"`):
```ts
type FormFieldProps = { id: string; label: string; hint?: string; error?: string; children: ReactNode };
```
Renders a `div.space-y-1.5` with `<Label htmlFor={id}>{label}</Label>`, then `children` (the control), then an optional hint `<p id={`${id}-hint`} className="text-xs text-muted-foreground">` and an optional error `<p id={`${id}-error`} role="alert" className="text-sm text-destructive">`. Callers set `aria-describedby` and `aria-invalid` on the control themselves.

2. `NumberInput.tsx` (`"use client"` not required, it is stateless):
```ts
type NumberInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string; onChange: (value: string) => void; unit?: string;
};
```
Renders a relative wrapper with `<Input type="text" inputMode="decimal" value onChange={(e) => onChange(e.target.value)} {...rest} className="pr-12 …" />` and, when `unit` is given, an absolutely positioned `<span className="pointer-events-none … text-muted-foreground">{unit}</span>` at the right. (Text input with `inputMode="decimal"`, not `type="number"`, so comma decimals work in Polish.)

3. `SubmitButton.tsx` (`"use client"`):
```ts
type SubmitButtonProps = { children: ReactNode; pendingLabel: string };
```
Uses `useFormStatus` from `react-dom`. Renders `<Button type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : children}</Button>`.

## Messages
Add a new top-level `"profile"` object to BOTH `src/messages/en.json` and `src/messages/pl.json` (after `"pages"`). Same keys in both files, no empty strings (a test enforces parity).

```jsonc
// en
"profile": {
  "fields": { "sex": "Sex", "birthDate": "Date of birth", "heightCm": "Height", "weightKg": "Weight",
              "activityLevel": "Activity level", "kcalGoal": "Daily calorie goal",
              "proteinGoalG": "Daily protein goal (optional)" },
  "units": { "cm": "cm", "kg": "kg", "kcal": "kcal", "g": "g" },
  "sex": { "male": "Male", "female": "Female" },
  "activity": { "sedentary": "Sedentary (little or no exercise)", "light": "Light (1–3 days a week)",
                "moderate": "Moderate (3–5 days a week)", "active": "Active (6–7 days a week)",
                "very_active": "Very active (hard training or physical job)" },
  "results": { "title": "Your requirement", "age": "Age", "years": "years",
               "bmr": "Base metabolic rate (BMR)", "bmrHint": "Calories burned at rest",
               "tdee": "Daily requirement (TDEE)", "tdeeHint": "BMR × activity multiplier",
               "incomplete": "Fill in the form to see your requirement.", "useAsGoal": "Use as goal" },
  "actions": { "save": "Save", "saving": "Saving…" },
  "toast": { "saved": "Personal data saved", "failed": "Could not save. Try again." },
  "errors": { "sexInvalid": "Choose your sex.", "birthDateInvalid": "Enter a valid date of birth.",
              "birthDateFuture": "Date of birth cannot be in the future.",
              "heightRange": "Enter a height from 100 to 250 cm.", "weightRange": "Enter a weight from 30 to 300 kg.",
              "activityInvalid": "Choose an activity level.", "kcalGoalRange": "Enter a goal from 800 to 10000 kcal.",
              "proteinGoalRange": "Enter protein from 0 to 500 g." }
}
```
```jsonc
// pl
"profile": {
  "fields": { "sex": "Płeć", "birthDate": "Data urodzenia", "heightCm": "Wzrost", "weightKg": "Waga",
              "activityLevel": "Poziom aktywności", "kcalGoal": "Dzienny cel kalorii",
              "proteinGoalG": "Dzienny cel białka (opcjonalnie)" },
  "units": { "cm": "cm", "kg": "kg", "kcal": "kcal", "g": "g" },
  "sex": { "male": "Mężczyzna", "female": "Kobieta" },
  "activity": { "sedentary": "Siedzący tryb życia (brak lub mało ćwiczeń)", "light": "Lekka (1–3 dni w tygodniu)",
                "moderate": "Umiarkowana (3–5 dni w tygodniu)", "active": "Duża (6–7 dni w tygodniu)",
                "very_active": "Bardzo duża (ciężki trening lub praca fizyczna)" },
  "results": { "title": "Twoje zapotrzebowanie", "age": "Wiek", "years": "lat",
               "bmr": "Podstawowa przemiana materii (BMR)", "bmrHint": "Kalorie spalane w spoczynku",
               "tdee": "Dzienne zapotrzebowanie (TDEE)", "tdeeHint": "BMR × współczynnik aktywności",
               "incomplete": "Wypełnij formularz, aby zobaczyć zapotrzebowanie.", "useAsGoal": "Ustaw jako cel" },
  "actions": { "save": "Zapisz", "saving": "Zapisywanie…" },
  "toast": { "saved": "Zapisano dane osobowe", "failed": "Nie udało się zapisać. Spróbuj ponownie." },
  "errors": { "sexInvalid": "Wybierz płeć.", "birthDateInvalid": "Podaj poprawną datę urodzenia.",
              "birthDateFuture": "Data urodzenia nie może być w przyszłości.",
              "heightRange": "Podaj wzrost od 100 do 250 cm.", "weightRange": "Podaj wagę od 30 do 300 kg.",
              "activityInvalid": "Wybierz poziom aktywności.", "kcalGoalRange": "Podaj cel od 800 do 10000 kcal.",
              "proteinGoalRange": "Podaj białko od 0 do 500 g." }
}
```
Keep the file's existing formatting (2-space indent, one key per line). `AppConfig` types messages from `pl.json`, so the keys must exist in `pl.json` for `t()` to type-check.

**Files:**
- Create: `src/components/forms/FormField.tsx`, `src/components/forms/NumberInput.tsx`, `src/components/forms/SubmitButton.tsx`
- Modify: `src/messages/en.json`, `src/messages/pl.json`: add the `profile` object

**Read:** `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/button.tsx` (exports `Button`), `src/messages/pl.json` (structure to match), `src/app/globals.css` (token names only: look for `destructive`)

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
