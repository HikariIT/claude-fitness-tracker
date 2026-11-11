"use client";

import { useFormatter, useTranslations } from "next-intl";
import { balanceStatus } from "@/lib/balance";
import { cn } from "@/lib/utils";

type BalanceStatusLabelProps = { balanceKcal: number };

/** D4: the status is always spelled out in text, so colour is never the only signal. */
export function BalanceStatusLabel({ balanceKcal }: BalanceStatusLabelProps) {
  const t = useTranslations("balance");
  const format = useFormatter();
  const status = balanceStatus(balanceKcal);
  const kcal = format.number(Math.abs(Math.round(balanceKcal)));

  if (status === "deficit") {
    return <span className={cn("text-steel-blue-300")}>{t("status.deficit", { kcal })}</span>;
  }
  if (status === "surplus") {
    return <span className={cn("text-destructive")}>{t("status.surplus", { kcal })}</span>;
  }
  return <span className={cn("text-muted-foreground")}>{t("status.even")}</span>;
}
