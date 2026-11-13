import type { KomgaBook, KomgaSeries, KomgaLibrary, ReadProgress } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { Page } from "../pagination";
import { bookPageUrlTemplate, mediaUrl } from "@/lib/media/media-url";
import type {
  NormalizedBook,
  NormalizedBookMedia,
  NormalizedSeries,
  NormalizedLibrary,
  NormalizedReadProgress,
} from "../types";

export class KomgaAdapter {
  /**
   * Traduit une page Spring (base 0) vers le contrat 1-based. La requête part
   * avec `page - 1` ; la page renvoyée porte le numéro 1-based demandé, de
   * sorte qu'aucun code hors Komga ne voit la base 0.
   */
  static toPage<T>(response: LibraryResponse<unknown>, items: T[], page: number): Page<T> {
    return {
      items,
      page,
      totalPages: Math.max(1, response.totalPages),
      totalElements: response.totalElements,
    };
  }

  private static bookMedia(bookId: string): NormalizedBookMedia {
    return {
      pageUrlTemplate: bookPageUrlTemplate("komga", "book-page", bookId),
      thumbnailUrlTemplate: bookPageUrlTemplate("komga", "book-page-thumbnail", bookId),
    };
  }

  static toNormalizedReadProgress(rp: ReadProgress | null): NormalizedReadProgress | null {
    if (!rp) return null;
    return {
      page: rp.page ?? null,
      completed: rp.completed,
      lastReadAt: rp.readDate ?? null,
    };
  }

  static toNormalizedBook(book: KomgaBook): NormalizedBook {
    return {
      id: book.id,
      libraryId: book.libraryId,
      title: book.metadata?.title || book.name,
      number: book.metadata?.number ?? null,
      seriesId: book.seriesId ?? null,
      seriesName: book.seriesTitle ?? null,
      volume: typeof book.number === "number" ? book.number : null,
      pageCount: book.media?.pagesCount ?? 0,
      thumbnailUrl: mediaUrl("komga", { kind: "book-cover", bookId: book.id }),
      media: KomgaAdapter.bookMedia(book.id),
      downloadUrl: mediaUrl("komga", { kind: "book-file", bookId: book.id }),
      readProgress: KomgaAdapter.toNormalizedReadProgress(book.readProgress),
      summary: book.metadata?.summary?.trim() || null,
    };
  }

  static toNormalizedSeries(series: KomgaSeries): NormalizedSeries {
    return {
      id: series.id,
      name: series.metadata?.title ?? series.name,
      bookCount: series.booksCount,
      booksReadCount: series.booksReadCount,
      thumbnailUrl: mediaUrl("komga", { kind: "series-cover", seriesId: series.id }),
      libraryId: series.libraryId,
      summary: series.metadata?.summary ?? null,
      authors: series.booksMetadata?.authors ?? [],
      genres: series.metadata?.genres ?? [],
      tags: series.metadata?.tags ?? [],
      createdAt: series.created ?? null,
    };
  }

  static toNormalizedLibrary(library: KomgaLibrary): NormalizedLibrary {
    return {
      id: library.id,
      name: library.name,
      bookCount: library.booksCount,
      booksReadCount: library.booksReadCount,
    };
  }
}
