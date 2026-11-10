import { redirect } from "@/i18n/navigation";
import type { Locale } from "next-intl";

export default async function LocaleIndexPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: "/planner", locale: locale as Locale });
}
