# 2. shadcn/ui init, palette theme, notebook styles, fonts
**Decisions:** D4, D5, D6, D7, D8, D16

Goal: initialise shadcn/ui (Tailwind 4), add the primitives, then rewrite `src/app/globals.css` so the whole theme comes from the palette, with a ruled-paper utility. Define the two Google Fonts in one module. Do not touch `src/app/layout.tsx` or `page.tsx` (subtask 4 replaces them).

## Steps
1. Init shadcn non-interactively: `npx shadcn@latest init -y -d --base-color neutral`. If the CLI still prompts or fails, create `components.json` by hand:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide"
}
```
   Then install `clsx tailwind-merge class-variance-authority lucide-react tw-animate-css` and create `src/lib/utils.ts` with the standard `cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }`.
2. Add primitives: `npx shadcn@latest add button input label card select table dialog tabs badge separator sonner -y`. They land in `src/components/ui/`. Do not hand-edit them, except in `src/components/ui/sonner.tsx`: if it imports `next-themes`, remove that import and the `useTheme` usage and hard-code `theme="light"` (D6). Uninstall `next-themes` if it was added.
3. Pin every dependency that shadcn added to an exact version in `package.json` (remove `^`/`~` for the new entries), then run `npm install` to sync the lock file.
4. Rewrite `src/app/globals.css` (shadcn's init overwrites it; replace its content). Keep this structure:
```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* Palette, copied from the `palette` file in the repo root: 5 scales x 100..900 (45 tokens).
     Token names use hyphens instead of the file's underscores:
     platinum -> --color-platinum-<n>, dusk_blue -> --color-dusk-blue-<n>,
     steel_blue -> --color-steel-blue-<n>, icy_blue -> --color-icy-blue-<n>, grey_olive -> --color-grey-olive-<n> */
  --color-platinum-100: #263138; /* ... through --color-platinum-900: #fafbfc, then the other 4 scales */
}

:root {
  --radius: 0.375rem;
  --background: var(--color-platinum-800);       /* paper */
  --foreground: var(--color-dusk-blue-300);      /* ink */
  --card: var(--color-platinum-900);
  --card-foreground: var(--color-dusk-blue-300);
  --popover: var(--color-platinum-900);
  --popover-foreground: var(--color-dusk-blue-300);
  --primary: var(--color-dusk-blue-500);
  --primary-foreground: var(--color-platinum-900);
  --secondary: var(--color-icy-blue-800);
  --secondary-foreground: var(--color-dusk-blue-400);
  --muted: var(--color-platinum-600);
  --muted-foreground: var(--color-grey-olive-400);
  --accent: var(--color-icy-blue-700);
  --accent-foreground: var(--color-dusk-blue-400);
  --destructive: #b42318;
  --border: var(--color-steel-blue-800);
  --input: var(--color-steel-blue-700);
  --ring: var(--color-steel-blue-500);
  --paper-line: var(--color-icy-blue-700);
  --paper-margin: var(--color-steel-blue-500);
  --paper-line-gap: 1.75rem;
}

@theme inline {
  /* shadcn mapping: --color-background: var(--background); ... for every token above
     (background, foreground, card, card-foreground, popover, popover-foreground, primary,
     primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent,
     accent-foreground, destructive, border, input, ring) */
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --font-sans: var(--font-nunito);
  --font-hand: var(--font-patrick-hand);
}

/* Ruled notebook paper with a left margin line (D4) */
@utility notebook-paper {
  background-color: var(--color-platinum-900);
  background-image:
    linear-gradient(to right, transparent 3rem, var(--paper-margin) 3rem, var(--paper-margin) calc(3rem + 2px), transparent calc(3rem + 2px)),
    repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--paper-line-gap) - 1px), var(--paper-line) calc(var(--paper-line-gap) - 1px), var(--paper-line) var(--paper-line-gap));
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  h1, h2, h3 { @apply font-hand; }
}
```
   Rules: no `prefers-color-scheme` block, no `.dark` block, no `@custom-variant dark` (D6). Remove any oklch neutral values shadcn wrote. Keep the existing `@tailwindcss/turbopack` setup in `next.config.ts` untouched.
5. `src/app/fonts.ts`:
```ts
import { Nunito, Patrick_Hand } from "next/font/google";

export const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
export const patrickHand = Patrick_Hand({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-patrick-hand", display: "swap" });
```
   Subtask 4 puts `${nunito.variable} ${patrickHand.variable}` on `<html>`.

**Files:**
- Create: `components.json`: shadcn config
- Create: `src/lib/utils.ts`: `cn()` (shadcn creates it)
- Create: `src/components/ui/*.tsx`: generated primitives (button, input, label, card, select, table, dialog, tabs, badge, separator, sonner)
- Modify: `src/app/globals.css`: palette tokens, shadcn mapping, `notebook-paper` utility, base styles
- Create: `src/app/fonts.ts`: Google Fonts
- Modify: `package.json`, `package-lock.json`: new exact-pinned deps

**Read:** `palette` (repo root, one line: 5 scales with hex values 100–900), `src/app/globals.css`, `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` (only the Google Fonts section)

**Verify:** `npx tsc --noEmit && npm run lint`

**Notes:** The current shadcn CLI rejects `--base-color` and defaults to a different preset, so `components.json` was written by hand. Its generated primitives imported `cn` from a stray npm package; they now import `@/lib/utils`, and the `cn` and `next-themes` packages were removed. `radix-ui` 1.8.1 and `sonner` 2.0.8 are pinned. Primitives still contain `dark:` utilities, which follow OS dark mode under Tailwind v4's default variant, because D6 forbids a custom dark variant. `layout.tsx` still uses Geist, which subtask 4 replaces.
