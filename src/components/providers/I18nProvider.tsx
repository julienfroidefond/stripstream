"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import i18n from "i18next";
import "@/i18n/i18n";

export function I18nProvider({ children, locale }: PropsWithChildren<{ locale: string }>) {
  // On lit directement l'instance i18next (import de module, identité stable)
  // plutôt que `useTranslation().i18n` : depuis react-i18next 17, le hook renvoie
  // un nouveau wrapper à chaque changement de langue. Utilisé comme dépendance
  // d'effet, ce wrapper relancerait la synchronisation juste après un choix
  // manuel et réappliquerait la locale serveur (cookie), annulant la sélection.
  // Dépendre uniquement de `locale` garantit qu'on ne synchronise que lorsque la
  // valeur serveur change réellement (chargement initial, navigation).
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return <>{children}</>;
}
