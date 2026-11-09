"use client";

import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedBook } from "@/lib/providers/types";

/** Libellé lisible d'un tome : son titre, sinon « Tome N ». */
export function useBookLabel() {
  const { t } = useTranslate();

  return (book: NormalizedBook): string => {
    const title = book.title?.trim();
    if (title) return title;
    if (book.number) return t("navigation.volume", { number: book.number });
    return t("navigation.bookLabel");
  };
}
