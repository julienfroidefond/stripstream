"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import "@/i18n/i18n";

export function I18nProvider({ children, locale }: PropsWithChildren<{ locale: string }>) {
  const { i18n } = useTranslate();

  // La locale serveur (cookie NEXT_LOCALE ou défaut) fait autorité au chargement
  // et à chaque changement propagé par le serveur (navigation). On l'applique dans
  // un effet dépendant de `locale` pour ne PAS écraser un changement manuel du
  // LanguageSelector : celui-ci modifie i18n sans changer la prop `locale`, donc
  // ré-appliquer la locale serveur à chaque render annulerait la sélection.
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [i18n, locale]);

  return <>{children}</>;
}
