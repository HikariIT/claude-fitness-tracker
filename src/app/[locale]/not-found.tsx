import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Link href="/planner" className={buttonVariants({ variant: "outline" })}>
        {t("back")}
      </Link>
    </>
  );
}
