import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export async function generateMetadata({ params }: PageProps<"/[locale]/balance">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.balance" });
  return { title: t("title") };
}

export default async function BalancePage({ params }: PageProps<"/[locale]/balance">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.balance");
  const common = await getTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState icon={Scale} title={common("emptyTitle")} description={common("comingSoon")} />
    </>
  );
}
