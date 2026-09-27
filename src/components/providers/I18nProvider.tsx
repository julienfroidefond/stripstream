"use client";

import type { PropsWithChildren } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import "@/i18n/i18n";

export function I18nProvider({ children, locale }: PropsWithChildren<{ locale: string }>) {
  const { i18n } = useTranslate();

  // La locale provient du serveur (cookie NEXT_LOCALE ou défaut) et est identique
  // lors de l'hydratation. On l'applique des deux côtés pour garantir un rendu
  // serveur/client cohérent, quel que soit le cookie ou la langue du navigateur.
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

  return <>{children}</>;
}
