import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlannerSection } from "@/features/planner/components/PlannerSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/planner">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.planner" });
  return { title: t("title") };
}

export default async function PlannerPage({ params }: PageProps<"/[locale]/planner">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.planner");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={null}>
        <PlannerSection />
      </Suspense>
    </>
  );
}
