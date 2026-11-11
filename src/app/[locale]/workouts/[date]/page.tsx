import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkoutsSection } from "@/features/workouts/components/WorkoutsSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/workouts/[date]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.workouts" });
  return { title: t("title") };
}

/** No generateStaticParams: any ISO date is valid (D1), so `date` is only known per request. */
export default function WorkoutsDatePage({ params }: PageProps<"/[locale]/workouts/[date]">) {
  return (
    <Suspense fallback={null}>
      <WorkoutsDateContent params={params} />
    </Suspense>
  );
}

async function WorkoutsDateContent({ params }: Pick<PageProps<"/[locale]/workouts/[date]">, "params">) {
  const { locale, date } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.workouts");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <WorkoutsSection dateParam={Promise.resolve(date)} />
    </>
  );
}
