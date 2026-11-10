# src/components: shared, feature-agnostic UI

**`ui/`**: shadcn/ui primitives: `badge`, `button`, `card`, `dialog`, `input`, `label`, `select`, `separator`, `sonner`, `table`, `tabs`.
- Add more with `npx shadcn@latest add <name>`, then pin any new deps exactly.
- Do not hand-edit generated files. Exception: `sonner.tsx` is light-only (no next-themes).

**`layout/`**:
- `AppNav`: notebook index tabs for the 5 views; scrolls horizontally on mobile. No props.
- `LanguageToggle`: PL/EN switch. Uses `useRouter().replace(pathname, { locale })`, so the current page is kept. No props.
- `NotebookSheet({ children, className? })`: ruled-paper sheet with the margin line.
- `PageHeader({ title, description?, actions? })`: page heading (`font-hand`) with optional actions.
- `EmptyState({ title, description?, icon? })`: placeholder for empty or unbuilt views (`icon` is a lucide component).

**`forms/`**:
- `FormField({ id, label, hint?, error?, children })`: label, hint and error wrapper around one input.
- `NumberInput({ value, onChange, unit?, ...input })`: text input with decimal `inputMode`. Accepts comma decimals.
- `SubmitButton({ children, pendingLabel })`: submit button that uses `useFormStatus` to show `pendingLabel` while pending.
- `field-styles.ts`: `fieldControlClass` (`h-9`, opaque `bg-white`). Apply it to every input and select trigger on the notebook sheet.

**Notebook ruling:** `--paper-line-gap` is `2.25rem` (36px = `h-9`, the standard control height). The sheet uses `py-9 leading-9`. Everything placed on the sheet takes a whole number of lines: `FormField` rows (label, control, error) are one line each and stack with no gap, sections are separated by `space-y-9` / `gap-y-9`, and cards use heights in whole lines (e.g. `min-h-27` = 3 lines). Keep controls as block or flex items, not inline, or the text baseline adds sub-pixel drift.

**`data/`**:
- `StatCard({ label, value: number, unit?, hint?, maximumFractionDigits? })`: one number tile. Formats numbers with `useFormatter`.
- `DatePager({ date, basePath })`: prev/next day links to `<basePath>/<YYYY-MM-DD>`. `basePath` is `"/planner" | "/workouts" | "/balance"`, and the "today" button links to `basePath` alone.

**Rules:**
- Never import from `features/`, `server/` or `db/`.
- Labels come in as translated props, or are read with `useTranslations` inside the component.
- Style with palette tokens (`primary`, `accent`, `muted-foreground`, `bg-icy-blue-*`, ...), never raw hex.
- Light mode only. No dark-mode variants.
- Pure date helpers live in `@/lib/dates`, not here.
