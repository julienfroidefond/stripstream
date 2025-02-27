"use client";

import { PropsWithChildren } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import "@/i18n/i18n";

export function I18nProvider({ children, locale }: PropsWithChildren<{ locale: string }>) {
  const { i18n } = useTranslate();
  // Synchroniser la langue avec celle du cookie côté client
  if (typeof window !== "undefined") {
    const localeCookie = document.cookie.split("; ").find((row) => row.startsWith("NEXT_LOCALE="));
    console.log(localeCookie);
    if (localeCookie) {
      const locale = localeCookie.split("=")[1];
      if (i18n.language !== locale) {
        i18n.changeLanguage(locale);
      }
    }
  } else {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }

  return <>{children}</>;
}
