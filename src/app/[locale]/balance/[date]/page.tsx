import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { BalanceSection } from "@/features/balance/components/BalanceSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/balance/[date]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.balance" });
  return { title: t("title") };
}

/** No generateStaticParams: any ISO date is valid (D5), so `date` is only known per request. */
export default function BalanceDatePage({ params }: PageProps<"/[locale]/balance/[date]">) {
  return (
    <Suspense fallback={null}>
      <BalanceDateContent params={params} />
    </Suspense>
  );
}

async function BalanceDateContent({ params }: Pick<PageProps<"/[locale]/balance/[date]">, "params">) {
  const { locale, date } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.balance");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <BalanceSection dateParam={Promise.resolve(date)} />
    </>
  );
}
