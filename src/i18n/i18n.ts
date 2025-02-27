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
        order: ["cookie", "localStorage", "navigator"],
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
}

export default i18n;
