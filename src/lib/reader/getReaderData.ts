import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeriesRating } from "@/lib/providers/types";
import type { ReaderInfo } from "@/lib/reader/types";
import { resolveBookSeries } from "@/lib/resume/series-pool";
import logger from "@/lib/logger";

export interface ReaderData {
  book: NormalizedBook;
  pages: number[];
  nextBook: NormalizedBook | null;
  readerInfo: ReaderInfo | null;
  /** Note de la série affichée en fin de lecture, ou null si non supportée/disponible. */
  seriesRating: NormalizedSeriesRating | null;
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

  if (!book.seriesId && !book.seriesName) {
    return fallbackInfo;
  }

  try {
    const series = await resolveBookSeries(provider, book);
    if (!series) {
      return fallbackInfo;
    }

    let positionInSeries: number | null = book.volume ?? null;
    let totalInSeries: number | null = series.bookCount ?? null;

    try {
      // Charge au maximum 100 tomes pour le calcul de position : un full-load
      // de série géante est inutile pour la position du tome courant.
      const seriesBooks = await provider.getBooks({
        seriesId: series.id,
        limit: Math.min(Math.max(series.bookCount || 0, 24), 100),
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

async function getReaderSeriesRating(
  provider: IMediaProvider,
  seriesId: string | null
): Promise<NormalizedSeriesRating | null> {
  if (!seriesId) return null;

  const ratings = provider.capabilities.ratings;
  if (!ratings) return null;

  try {
    return await ratings.getSeriesRating(seriesId);
  } catch (error) {
    logger.warn({ err: error, seriesId }, "Failed to fetch reader series rating");
    return null;
  }
}

export async function getReaderData(
  provider: IMediaProvider,
  bookId: string
): Promise<ReaderData> {
  // getNextBook ne dépend que de bookId : on le lance en parallèle de getBook.
  const [book, nextBook] = await Promise.all([
    provider.getBook(bookId),
    provider.getNextBook(bookId).catch((error) => {
      logger.warn({ err: error, bookId }, "Failed to fetch next book, continuing without it");
      return null;
    }),
  ]);

  const pages = Array.from({ length: book.pageCount }, (_, i) => i + 1);
  const [readerInfo, seriesRating] = await Promise.all([
    getReaderInfo(provider, book),
    getReaderSeriesRating(provider, book.seriesId ?? null),
  ]);

  return {
    book,
    pages,
    nextBook,
    readerInfo,
    seriesRating,
  };
}
