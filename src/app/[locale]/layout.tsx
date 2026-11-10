import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { nunito, patrickHand } from "../fonts";
import "../globals.css";
import { AppNav } from "@/components/layout/AppNav";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { NotebookSheet } from "@/components/layout/NotebookSheet";
import { Toaster } from "@/components/ui/sonner";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: { default: t("name"), template: `%s · ${t("name")}` }, description: t("description") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("app");
  const nav = await getTranslations("nav");
  return (
    <html lang={locale} className={`${nunito.variable} ${patrickHand.variable} h-full`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <a
            href="#content"
            className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
          >
            {nav("skip")}
          </a>
          <div className="mx-auto w-full max-w-5xl px-4 py-6">
            <header className="mb-4 flex items-center justify-between gap-4">
              <span className="font-hand text-3xl text-primary">{t("name")}</span>
              <LanguageToggle />
            </header>
            <AppNav />
            <main id="content">
              <NotebookSheet>{children}</NotebookSheet>
            </main>
          </div>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
