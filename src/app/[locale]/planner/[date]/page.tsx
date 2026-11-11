import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlannerSection } from "@/features/planner/components/PlannerSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/planner/[date]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.planner" });
  return { title: t("title") };
}

/** No generateStaticParams: any ISO date is valid (D10), so `date` is only known per request. */
export default function PlannerDatePage({ params }: PageProps<"/[locale]/planner/[date]">) {
  return (
    <Suspense fallback={null}>
      <PlannerDateContent params={params} />
    </Suspense>
  );
}

async function PlannerDateContent({ params }: Pick<PageProps<"/[locale]/planner/[date]">, "params">) {
  const { locale, date } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.planner");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PlannerSection dateParam={Promise.resolve(date)} />
    </>
  );
}
