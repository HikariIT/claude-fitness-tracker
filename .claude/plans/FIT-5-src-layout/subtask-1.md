# 1. Move app/ to src/app and update the alias
**Decisions:** D2

**Notes:** After deleting `.next/`, `npx tsc --noEmit` fails until `next build` regenerates `.next/types` (LayoutProps). Run build before tsc. The host `node_modules` holds Linux-only native binaries (lightningcss, swc), so `next build` was run in `node:24-slim` via Docker on a clean copy; host `tsc` and `eslint` pass.

Goal: the Next.js App Router lives in `src/app/`, and `@/*` resolves to `./src/*`. Next.js 16.4 supports `src/app` natively. Next ignores `src/app` if a root `app/` still exists, so the root `app/` must be gone.

Steps:
1. Move the folder with git so history is kept: `git mv app src/app`. Create `src/` first if git needs it. It contains `favicon.ico`, `globals.css`, `layout.tsx` and `page.tsx`. Do not change their contents. `layout.tsx` imports `./globals.css` relatively, so it keeps working.
2. In `tsconfig.json`, change `"paths": { "@/*": ["./*"] }` to `"paths": { "@/*": ["./src/*"] }`. Leave everything else as it is.
3. Keep these at the project root: `public/`, `next.config.ts`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.env*`. Tailwind 4 detects sources automatically, and there is no `tailwind.config.js`, so nothing else changes.
4. In `README.md` line 13, change `app/page.tsx` to `src/app/page.tsx`.
5. Delete the stale build cache (`.next/`) so old route types do not break type checking. It is git-ignored.
6. Do NOT create `src/features`, `src/components`, `src/db`, `src/server`, `src/lib` or `src/types` (D2).

The Dockerfile (`COPY . .`) and `docker-compose.dev.yml` (bind mount `.:/app`) copy the whole project, so they need no changes.

**Files:**
- Create: `src/app/` (via `git mv`)
- Modify: `tsconfig.json`: the `paths` entry `@/*` changes to `./src/*`
- Modify: `README.md`: line 13 path
- Remove: `app/` (moved), `.next/` (cache)

**Read:** `tsconfig.json`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md`

**Verify:** `npx tsc --noEmit; if ($?) { npm run lint }; if ($?) { npm run build }`
