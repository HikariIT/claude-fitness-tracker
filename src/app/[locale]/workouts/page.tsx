import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkoutsSection } from "@/features/workouts/components/WorkoutsSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/workouts">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.workouts" });
  return { title: t("title") };
}

export default async function WorkoutsPage({ params }: PageProps<"/[locale]/workouts">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.workouts");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={null}>
        <WorkoutsSection />
      </Suspense>
    </>
  );
}
