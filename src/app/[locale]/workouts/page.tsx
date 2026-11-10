import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";

export async function generateMetadata({ params }: PageProps<"/[locale]/workouts">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.workouts" });
  return { title: t("title") };
}

export default async function WorkoutsPage({ params }: PageProps<"/[locale]/workouts">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.workouts");
  const common = await getTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState icon={Dumbbell} title={common("emptyTitle")} description={common("comingSoon")} />
    </>
  );
}
