import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export async function generateMetadata({ params }: PageProps<"/[locale]/planner">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.planner" });
  return { title: t("title") };
}

export default async function PlannerPage({ params }: PageProps<"/[locale]/planner">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.planner");
  const common = await getTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState icon={CalendarDays} title={common("emptyTitle")} description={common("comingSoon")} />
    </>
  );
}
