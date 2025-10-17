import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

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

    return NextResponse.json({ books, series });
  } catch (error) {
    console.error("API Series Books - Erreur:", error);
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

