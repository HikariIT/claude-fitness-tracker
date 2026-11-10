import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { Apple } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export async function generateMetadata({ params }: PageProps<"/[locale]/foods">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.foods" });
  return { title: t("title") };
}

export default async function FoodsPage({ params }: PageProps<"/[locale]/foods">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.foods");
  const common = await getTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState icon={Apple} title={common("emptyTitle")} description={common("comingSoon")} />
    </>
  );
}
