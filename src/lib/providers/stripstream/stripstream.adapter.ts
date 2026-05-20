import type {
  StripstreamBookItem,
  StripstreamBookDetails,
  StripstreamSeriesItem,
  StripstreamLibraryResponse,
  StripstreamReadingProgressResponse,
  StripstreamRelatedSeriesItem,
  StripstreamRecommendedSeriesItem,
} from "@/types/stripstream";
import type {
  NormalizedBook,
  NormalizedSeries,
  NormalizedLibrary,
  NormalizedReadProgress,
} from "../types";

export class StripstreamAdapter {
  static toNormalizedReadProgress(
    rp: StripstreamReadingProgressResponse | null
  ): NormalizedReadProgress | null {
    if (!rp) return null;
    return {
      page: rp.current_page ?? null,
      completed: rp.status === "read",
      lastReadAt: rp.last_read_at ?? null,
    };
  }

  static toNormalizedBook(book: StripstreamBookItem): NormalizedBook {
    return {
      id: book.id,
      libraryId: book.library_id,
      title: book.title,
      number: book.volume !== null && book.volume !== undefined ? String(book.volume) : null,
      seriesId: book.series_id ?? book.series ?? null,
      volume: book.volume ?? null,
      pageCount: book.page_count ?? 0,
      thumbnailUrl: `/api/stripstream/images/books/${book.id}/thumbnail`,
      readProgress:
        book.reading_status === "unread" && !book.reading_current_page
          ? null
          : {
              page: book.reading_current_page ?? null,
              completed: book.reading_status === "read",
              lastReadAt: book.reading_last_read_at ?? null,
            },
      volumeType: book.volume_type ?? null,
    };
  }

  static toNormalizedBookDetails(book: StripstreamBookDetails): NormalizedBook {
    return {
      id: book.id,
      libraryId: book.library_id,
      title: book.title,
      number: book.volume !== null && book.volume !== undefined ? String(book.volume) : null,
      // Prefer the UUID when the details payload provides it (BookDetails has
      // series_id, BookItem does not). Falls back to the series name otherwise.
      seriesId: book.series_id ?? book.series ?? null,
      volume: book.volume ?? null,
      pageCount: book.page_count ?? 0,
      thumbnailUrl: `/api/stripstream/images/books/${book.id}/thumbnail`,
      readProgress:
        book.reading_status === "unread" && !book.reading_current_page
          ? null
          : {
              page: book.reading_current_page ?? null,
              completed: book.reading_status === "read",
              lastReadAt: book.reading_last_read_at ?? null,
            },
      volumeType: book.volume_type ?? null,
      summary: book.summary?.trim() || null,
    };
  }

  static toNormalizedSeries(series: StripstreamSeriesItem): NormalizedSeries {
    const isValidId = series.first_book_id && series.first_book_id !== "00000000-0000-0000-0000-000000000000";
    const thumbnailUrl = isValidId
      ? `/api/stripstream/images/books/${series.first_book_id}/thumbnail`
      : (series.cover_url ?? "");
    return {
      id: series.series_id,
      name: series.name,
      bookCount: series.book_count,
      booksReadCount: series.books_read_count,
      thumbnailUrl,
      libraryId: series.library_id,
      summary: series.description?.trim() || null,
      authors: (series.authors ?? []).map((name) => ({ name, role: "" })),
      genres: series.genres ?? [],
      tags: [],
      createdAt: null,
      missingCount: series.missing_count ?? null,
      seriesStatus: series.series_status ?? null,
    };
  }

  static toNormalizedRelatedSeries(item: StripstreamRelatedSeriesItem): NormalizedSeries {
    const isValidId = item.first_book_id && item.first_book_id !== "00000000-0000-0000-0000-000000000000";
    const thumbnailUrl = isValidId
      ? `/api/stripstream/images/books/${item.first_book_id}/thumbnail`
      : (item.cover_url ?? "");
    return {
      id: item.series_id,
      name: item.name,
      bookCount: item.book_count,
      booksReadCount: item.books_read_count,
      thumbnailUrl,
      libraryId: item.library_id,
      summary: null,
      authors: [],
      genres: [],
      tags: [],
      createdAt: null,
      missingCount: null,
      seriesStatus: item.series_status ?? null,
      matchReasons: item.match_reasons,
    };
  }

  static toNormalizedRecommendedSeries(item: StripstreamRecommendedSeriesItem): NormalizedSeries {
    const isValidId = item.first_book_id && item.first_book_id !== "00000000-0000-0000-0000-000000000000";
    const thumbnailUrl = isValidId
      ? `/api/stripstream/images/books/${item.first_book_id}/thumbnail`
      : (item.cover_url ?? "");
    return {
      id: item.series_id,
      name: item.name,
      bookCount: item.book_count,
      booksReadCount: 0,
      thumbnailUrl,
      libraryId: item.library_id,
      summary: null,
      authors: [],
      genres: [],
      tags: [],
      createdAt: null,
      missingCount: null,
      seriesStatus: item.series_status ?? null,
      matchReasons: item.match_reasons,
      becauseOf: item.because_of,
    };
  }

  static toNormalizedLibrary(library: StripstreamLibraryResponse): NormalizedLibrary {
    return {
      id: library.id,
      name: library.name,
      bookCount: library.book_count,
    };
  }
}
