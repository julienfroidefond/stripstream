import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { page, completed } = await request.json();
    const bookId: string = (await params).bookId;

    if (typeof page !== "number") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "Progress update error",
            message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR),
          },
        },
        { status: 400 }
      );
    }

    await BookService.updateReadProgress(bookId, page, completed);

    // Invalider le cache de la série après avoir mis à jour la progression
    try {
      const seriesId = await BookService.getBookSeriesId(bookId);
      await SeriesService.invalidateSeriesBooksCache(seriesId);
      await SeriesService.invalidateSeriesCache(seriesId);
    } catch (cacheError) {
      // Ne pas faire échouer la requête si l'invalidation du cache échoue
      logger.error({ err: cacheError }, "Erreur lors de l'invalidation du cache de la série:");
    }

    return NextResponse.json({ message: "📖 Progression mise à jour avec succès" });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour de la progression:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Progress update error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
          name: "Progress update error",
          message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId: string = (await params).bookId;

    await BookService.deleteReadProgress(bookId);

    // Invalider le cache de la série après avoir supprimé la progression
    try {
      const seriesId = await BookService.getBookSeriesId(bookId);
      await SeriesService.invalidateSeriesBooksCache(seriesId);
      await SeriesService.invalidateSeriesCache(seriesId);
    } catch (cacheError) {
      // Ne pas faire échouer la requête si l'invalidation du cache échoue
      logger.error({ err: cacheError }, "Erreur lors de l'invalidation du cache de la série:");
    }

    return NextResponse.json({ message: "🗑️ Progression supprimée avec succès" });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression de la progression:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Progress delete error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR,
          name: "Progress delete error",
          message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
