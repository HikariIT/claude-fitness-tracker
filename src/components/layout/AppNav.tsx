"use client";

import { Suspense } from "react";
import { Apple, CalendarDays, Dumbbell, Scale, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { key: "profile", href: "/profile", icon: User },
  { key: "foods", href: "/foods", icon: Apple },
  { key: "planner", href: "/planner", icon: CalendarDays },
  { key: "workouts", href: "/workouts", icon: Dumbbell },
  { key: "balance", href: "/balance", icon: Scale },
] as const;

/**
 * usePathname suspends while prerendering routes with params unknown at build time
 * (e.g. /planner/[date]), so it sits behind a Suspense boundary. The fallback is the
 * same nav with no active tab; fully static routes resolve the pathname in the shell.
 */
export function AppNav() {
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("label")} className="relative z-10 -mb-px">
      <ul className="flex gap-1 overflow-x-auto pb-px [scrollbar-color:var(--color-steel-blue-700)_transparent] [scrollbar-width:thin]">
        {items.map(({ key, href, icon: Icon }) => {
          const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
          return (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-border px-4 py-2 font-hand text-lg",
                  active
                    ? "relative top-px bg-platinum-900 text-primary"
                    : "bg-icy-blue-800 text-dusk-blue-400 hover:bg-icy-blue-700",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
