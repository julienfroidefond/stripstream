"use client";

import { useTranslate } from "@/hooks/useTranslate";

/** En-tête de la page compte : la copie suit la langue choisie (i18n client). */
export function AccountHeader() {
  const { t } = useTranslate();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t("account.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("account.subtitle")}</p>
    </div>
  );
}
