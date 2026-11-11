"use client";

import { Suspense, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * usePathname suspends while prerendering routes with params unknown at build time
 * (e.g. /planner/[date]), so it sits behind a Suspense boundary. The fallback shows
 * the same buttons, disabled until the pathname is known.
 */
export function LanguageToggle() {
  return (
    <Suspense fallback={<ToggleButtons onSelect={null} />}>
      <ActiveToggle />
    </Suspense>
  );
}

function ActiveToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <ToggleButtons
      disabled={isPending}
      onSelect={(locale) => startTransition(() => router.replace(pathname, { locale }))}
    />
  );
}

type ToggleButtonsProps = {
  /** null = not interactive yet (Suspense fallback). */
  onSelect: ((locale: (typeof routing.locales)[number]) => void) | null;
  disabled?: boolean;
};

function ToggleButtons({ onSelect, disabled = false }: ToggleButtonsProps) {
  const t = useTranslations("language");
  const current = useLocale();

  return (
    <div role="group" aria-label={t("label")} className="flex items-center gap-1">
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Button
            key={locale}
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            aria-label={`${locale.toUpperCase()} – ${t(locale)}`}
            aria-pressed={active}
            disabled={disabled || onSelect === null}
            onClick={onSelect ? () => onSelect(locale) : undefined}
          >
            {locale.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
}
