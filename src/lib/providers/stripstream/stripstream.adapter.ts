import type {
  StripstreamBookItem,
  StripstreamBookDetails,
  StripstreamSeriesItem,
  StripstreamLibraryResponse,
  StripstreamReadingProgressResponse,
  StripstreamReadingListItem,
  StripstreamRelatedSeriesItem,
  StripstreamRecommendedSeriesItem,
} from "@/types/stripstream";
import type {
  NormalizedBook,
  NormalizedSeries,
  NormalizedLibrary,
  NormalizedReadProgress,
} from "../types";

const SENTINEL_BOOK_ID = "00000000-0000-0000-0000-000000000000";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class StripstreamAdapter {
  private static bookThumbnail(bookId: string): string {
    return `/api/stripstream/images/books/${bookId}/thumbnail`;
  }

  /**
   * Series covers come from the first book when it exists; a series with no
   * book yet only carries its metadata `cover_url`.
   */
  private static seriesThumbnail(
    firstBookId: string | null | undefined,
    coverUrl: string | null | undefined
  ): string {
    if (firstBookId && firstBookId !== SENTINEL_BOOK_ID) {
      return StripstreamAdapter.bookThumbnail(firstBookId);
    }
    return coverUrl ?? "";
  }

  /**
   * `preview_covers` mixes book UUIDs with raw `cover_url` values (series that
   * have no book yet). Only a UUID can go through the book thumbnail proxy.
   */
  static resolveReadingListPreviewCover(cover: string | null | undefined): string {
    if (!cover || cover === SENTINEL_BOOK_ID) return "";
    return UUID_RE.test(cover)
      ? StripstreamAdapter.bookThumbnail(cover)
      : cover;
  }

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
      downloadUrl: `/api/stripstream/books/${book.id}/file`,
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
      downloadUrl: `/api/stripstream/books/${book.id}/file`,
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
    const thumbnailUrl = StripstreamAdapter.seriesThumbnail(
      series.first_book_id,
      series.cover_url
    );
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
      startYear: series.start_year ?? null,
      missingCount: series.missing_count ?? null,
      seriesStatus: series.series_status ?? null,
      communityScore: series.community_score ?? null,
      userRating: series.user_rating ?? null,
    };
  }

  static toNormalizedRelatedSeries(item: StripstreamRelatedSeriesItem): NormalizedSeries {
    const thumbnailUrl = StripstreamAdapter.seriesThumbnail(
      item.first_book_id,
      item.cover_url
    );
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
      startYear: item.start_year ?? null,
      missingCount: null,
      seriesStatus: item.series_status ?? null,
      matchReasons: item.match_reasons,
    };
  }

  static toNormalizedReadingListSeries(item: StripstreamReadingListItem): NormalizedSeries {
    return {
      id: item.id,
      name: item.name,
      bookCount: item.book_count,
      booksReadCount: item.books_read_count,
      thumbnailUrl: StripstreamAdapter.seriesThumbnail(
        item.first_book_id,
        item.cover_url
      ),
      libraryId: item.library_id,
      summary: null,
      authors: [],
      genres: [],
      tags: [],
      createdAt: null,
      missingCount: null,
      seriesStatus: null,
    };
  }

  static toNormalizedRecommendedSeries(item: StripstreamRecommendedSeriesItem): NormalizedSeries {
    const thumbnailUrl = StripstreamAdapter.seriesThumbnail(
      item.first_book_id,
      item.cover_url
    );
    return {
      id: item.series_id,
      name: item.name,
      bookCount: item.book_count,
      booksReadCount: 0,
      thumbnailUrl,
      libraryId: item.library_id,
      summary: item.description?.trim() || null,
      authors: (item.authors ?? []).map((name) => ({ name, role: "" })),
      genres: item.genres ?? [],
      tags: [],
      createdAt: null,
      startYear: item.start_year ?? null,
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
