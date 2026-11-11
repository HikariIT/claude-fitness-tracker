import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { BalanceSection } from "@/features/balance/components/BalanceSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/balance">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.balance" });
  return { title: t("title") };
}

export default async function BalancePage({ params }: PageProps<"/[locale]/balance">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.balance");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={null}>
        <BalanceSection />
      </Suspense>
    </>
  );
}
