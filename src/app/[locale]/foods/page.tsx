import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { FoodsSection } from "@/features/foods/components/FoodsSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/foods">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.foods" });
  return { title: t("title") };
}

export default async function FoodsPage({ params }: PageProps<"/[locale]/foods">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.foods");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={null}>
        <FoodsSection />
      </Suspense>
    </>
  );
}
