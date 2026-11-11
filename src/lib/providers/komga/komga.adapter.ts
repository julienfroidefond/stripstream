import type { KomgaBook, KomgaSeries, KomgaLibrary, ReadProgress } from "@/types/komga";
import { BOOK_PAGE_TOKEN } from "../book-media";
import type {
  NormalizedBook,
  NormalizedBookMedia,
  NormalizedSeries,
  NormalizedLibrary,
  NormalizedReadProgress,
} from "../types";

export class KomgaAdapter {
  private static bookMedia(bookId: string): NormalizedBookMedia {
    return {
      pageUrlTemplate: `/api/komga/images/books/${bookId}/pages/${BOOK_PAGE_TOKEN}`,
      thumbnailUrlTemplate: `/api/komga/images/books/${bookId}/pages/${BOOK_PAGE_TOKEN}/thumbnail`,
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
      thumbnailUrl: `/api/komga/images/books/${book.id}/thumbnail`,
      media: KomgaAdapter.bookMedia(book.id),
      downloadUrl: `/api/komga/books/${book.id}/file`,
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
      thumbnailUrl: `/api/komga/images/series/${series.id}/thumbnail`,
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
