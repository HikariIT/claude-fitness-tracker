"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageToggle() {
  const t = useTranslations("language");
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

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
            disabled={isPending}
            onClick={() => startTransition(() => router.replace(pathname, { locale }))}
          >
            {locale.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
}
