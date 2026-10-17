"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Importation des traductions
import frCommon from "./messages/fr/common.json";
import enCommon from "./messages/en/common.json";

// Ne pas initialiser i18next plus d'une fois
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector) // Détecte la langue du navigateur
    .use(initReactI18next)
    .init({
      resources: {
        fr: {
          common: frCommon,
        },
        en: {
          common: enCommon,
        },
      },
      defaultNS: "common",
      fallbackLng: "fr",
      interpolation: {
        escapeValue: false, // React gère déjà l'échappement
      },
      detection: {
        // Pas de détection `navigator` : le serveur ne peut pas la lire et son
        // repli sur `fallbackLng` provoquerait un décalage d'hydratation client.
        // Pas de repli `localStorage` non plus : la clé est partagée par tous
        // les comptes du navigateur, et le cookie `NEXT_LOCALE` (lisible par le
        // serveur, posé par le proxy et le sélecteur) est la source unique.
        order: ["cookie"],
        lookupCookie: "NEXT_LOCALE",
        caches: ["cookie"],
        cookieOptions: {
          path: "/",
          maxAge: 365 * 24 * 60 * 60, // 1 an
        },
      },
      react: {
        transSupportBasicHtmlNodes: true, // Permet l'utilisation de balises HTML de base
        transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "span"], // Liste des balises autorisées
      },
    });
} else {
  // Keep translation resources in sync during HMR/dev without full re-init.
  i18n.addResourceBundle("fr", "common", frCommon, true, true);
  i18n.addResourceBundle("en", "common", enCommon, true, true);
}
