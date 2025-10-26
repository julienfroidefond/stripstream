import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";
export const revalidate = 60;

const DEFAULT_PAGE_SIZE = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const seriesId: string = (await params).seriesId;
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || String(DEFAULT_PAGE_SIZE));
    const unreadOnly = searchParams.get("unread") === "true";

    const [books, series] = await Promise.all([
      SeriesService.getSeriesBooks(seriesId, page, size, unreadOnly),
      SeriesService.getSeries(seriesId)
    ]);

    return NextResponse.json(
      { books, series },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    logger.error({ err: error }, "API Series Books - Erreur:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Series books fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
          name: "Series books fetch error",
          message: getErrorMessage(ERROR_CODES.BOOK.PAGES_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const seriesId: string = (await params).seriesId;
    
    await Promise.all([
      SeriesService.invalidateSeriesBooksCache(seriesId),
      SeriesService.invalidateSeriesCache(seriesId)
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "API Series Cache Invalidation - Erreur:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Cache invalidation error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.DELETE_ERROR,
          name: "Cache invalidation error",
          message: getErrorMessage(ERROR_CODES.CACHE.DELETE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

