import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook } from "@/lib/providers/types";
import type { ReaderInfo } from "@/lib/reader/types";
import logger from "@/lib/logger";

export interface ReaderData {
  book: NormalizedBook;
  pages: number[];
  nextBook: NormalizedBook | null;
  readerInfo: ReaderInfo | null;
}

function sortBooksBySeriesPosition(a: NormalizedBook, b: NormalizedBook) {
  const aVolume = a.volume ?? Number.POSITIVE_INFINITY;
  const bVolume = b.volume ?? Number.POSITIVE_INFINITY;
  if (aVolume !== bVolume) return aVolume - bVolume;
  return a.title.localeCompare(b.title);
}

async function getReaderInfo(
  provider: IMediaProvider,
  book: NormalizedBook
): Promise<ReaderInfo | null> {
  const fallbackInfo: ReaderInfo = {
    seriesTitle: null,
    seriesSummary: null,
    bookSummary: book.summary ?? null,
    positionInSeries: book.volume ?? null,
    totalInSeries: null,
  };

  if (!book.seriesId) {
    return fallbackInfo;
  }

  try {
    const series = await provider.getSeriesById(book.seriesId);
    if (!series) {
      return fallbackInfo;
    }

    let positionInSeries: number | null = book.volume ?? null;
    let totalInSeries: number | null = series.bookCount ?? null;

    try {
      const seriesBooks = await provider.getBooks({
        seriesName: series.id,
        limit: Math.max(series.bookCount || 0, 24),
      });
      const orderedBooks = [...seriesBooks.items].sort(sortBooksBySeriesPosition);
      const bookIndex = orderedBooks.findIndex((candidate) => candidate.id === book.id);

      if (bookIndex >= 0) {
        positionInSeries = bookIndex + 1;
      }

      if (seriesBooks.totalElements && seriesBooks.totalElements > 0) {
        totalInSeries = seriesBooks.totalElements;
      } else if (orderedBooks.length > 0) {
        totalInSeries = orderedBooks.length;
      }
    } catch (error) {
      logger.warn({ err: error, bookId: book.id, seriesId: series.id }, "Failed to resolve reader series ordering");
    }

    return {
      seriesTitle: series.name,
      seriesSummary: series.summary ?? null,
      bookSummary: book.summary ?? null,
      positionInSeries,
      totalInSeries,
    };
  } catch (error) {
    logger.warn({ err: error, bookId: book.id, seriesId: book.seriesId }, "Failed to build reader info");
    return fallbackInfo;
  }
}

export async function getReaderData(
  provider: IMediaProvider,
  bookId: string
): Promise<ReaderData> {
  const book = await provider.getBook(bookId);
  const pages = Array.from({ length: book.pageCount }, (_, i) => i + 1);

  const [nextBook, readerInfo] = await Promise.all([
    provider.getNextBook(bookId).catch((error) => {
      logger.warn({ err: error, bookId }, "Failed to fetch next book, continuing without it");
      return null;
    }),
    getReaderInfo(provider, book),
  ]);

  return {
    book,
    pages,
    nextBook,
    readerInfo,
  };
}
