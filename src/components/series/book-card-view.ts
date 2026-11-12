import type { NormalizedBook } from "@/lib/providers/types";
import {
  getBookReadingStatusInfo,
  type BookReadingStatusInfo,
} from "@/lib/books/reading-status";

export type BookCardTranslate = (
  key: string,
  options?: { [key: string]: string | number }
) => string;

export interface BookCardView {
  title: string;
  coverAriaLabel: string;
  coverAlt: string;
  volumeLabel: string | null;
  pagesLabel: string;
  totalPages: number;
  statusInfo: BookReadingStatusInfo | null;
  isRead: boolean;
  hasReadProgress: boolean;
  currentPage: number;
  progressPercentage: number;
  completedLabel: string;
  summary: string | null;
}

/**
 * État de présentation partagé par les layouts grille et liste d'une carte.
 *
 * Les données du provider restent la source de vérité : le mode anonyme efface
 * l'état de lecture au lieu de le masquer dans chaque layout, et tous les
 * libellés sont dérivés ici pour que les deux layouts ne puissent pas diverger.
 */
export function buildBookCardView(
  book: NormalizedBook,
  t: BookCardTranslate,
  isAnonymous: boolean
): BookCardView {
  const totalPages = book.pageCount;
  const currentPage = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
  const title =
    book.title ||
    (book.number ? t("navigation.volume", { number: book.number }) : "");

  return {
    title,
    coverAriaLabel: t("books.coverLink", { title }),
    coverAlt: t("books.coverAlt", { title }),
    volumeLabel: book.number
      ? t("navigation.volume", { number: book.number })
      : null,
    pagesLabel: `${totalPages} ${
      totalPages > 1 ? t("books.pages_plural") : t("books.pages")
    }`,
    totalPages,
    statusInfo: isAnonymous ? null : getBookReadingStatusInfo(book, t),
    isRead: isAnonymous ? false : Boolean(book.readProgress?.completed),
    hasReadProgress: isAnonymous ? false : book.readProgress !== null,
    currentPage,
    progressPercentage: totalPages > 0 ? (currentPage / totalPages) * 100 : 0,
    completedLabel: t("books.completed"),
    summary: book.summary?.trim() || null,
  };
}
