import type {
  StripstreamBookItem,
  StripstreamBookDetails,
  StripstreamSeriesItem,
  StripstreamLibraryResponse,
  StripstreamReadingProgressResponse,
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
      seriesId: book.series ?? null,
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
    };
  }

  static toNormalizedBookDetails(book: StripstreamBookDetails): NormalizedBook {
    return {
      id: book.id,
      libraryId: book.library_id,
      title: book.title,
      number: book.volume !== null && book.volume !== undefined ? String(book.volume) : null,
      seriesId: book.series ?? null,
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
    };
  }

  static toNormalizedSeries(series: StripstreamSeriesItem): NormalizedSeries {
    return {
      id: series.series_id,
      name: series.name,
      bookCount: series.book_count,
      booksReadCount: series.books_read_count,
      thumbnailUrl: `/api/stripstream/images/books/${series.first_book_id}/thumbnail`,
      libraryId: series.library_id,
      summary: null,
      authors: [],
      genres: [],
      tags: [],
      createdAt: null,
      missingCount: series.missing_count ?? null,
      seriesStatus: series.series_status ?? null,
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
