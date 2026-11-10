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

**`data/`**:
- `StatCard({ label, value: number, unit?, hint?, maximumFractionDigits? })`: one number tile. Formats numbers with `useFormatter`.
- `DatePager({ date, basePath })`: prev/next day links to `<basePath>/<YYYY-MM-DD>`. `basePath` is `"/planner" | "/workouts" | "/balance"`, and the "today" button links to `basePath` alone.

**Rules:**
- Never import from `features/`, `server/` or `db/`.
- Labels come in as translated props, or are read with `useTranslations` inside the component.
- Style with palette tokens (`primary`, `accent`, `muted-foreground`, `bg-icy-blue-*`, ...), never raw hex.
- Light mode only. No dark-mode variants.
- Pure date helpers live in `@/lib/dates`, not here.
