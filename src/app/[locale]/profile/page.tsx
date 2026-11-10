import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileSection } from "@/features/profile/components/ProfileSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages.profile" });
  return { title: t("title") };
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.profile");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={null}>
        <ProfileSection />
      </Suspense>
    </>
  );
}
