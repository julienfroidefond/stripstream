import type { NormalizedBook } from "@/lib/providers/types";
import { formatDate } from "@/lib/utils";

export interface BookReadingStatusInfo {
  label: string;
  className: string;
}

type Translate = (
  key: string,
  options?: { [key: string]: string | number }
) => string;

/**
 * Badge de lecture partagé par toutes les surfaces de livre.
 *
 * Le badge est dérivé uniquement de la progression normalisée pour que la
 * grille, la liste et la couverture aient la même définition de « lu », « en
 * cours » et « non lu ».
 */
export function getBookReadingStatusInfo(
  book: Pick<NormalizedBook, "pageCount" | "readProgress">,
  t: Translate
): BookReadingStatusInfo {
  if (!book.readProgress) {
    return {
      label: t("books.status.unread"),
      className: "bg-amber-400/90 text-amber-950",
    };
  }

  if (book.readProgress.completed) {
    const readDate = book.readProgress.lastReadAt
      ? formatDate(book.readProgress.lastReadAt)
      : null;
    return {
      label: readDate
        ? t("books.status.readDate", { date: readDate })
        : t("books.status.read"),
      className: "bg-emerald-400/90 text-emerald-950",
    };
  }

  const currentPage = book.readProgress.page ?? 0;

  if (currentPage > 0) {
    return {
      label: t("books.status.progress", {
        current: currentPage,
        total: book.pageCount,
      }),
      className: "bg-teal-400/90 text-teal-950",
    };
  }

  return {
    label: t("books.status.unread"),
    className: "bg-amber-400/90 text-amber-950",
  };
}
