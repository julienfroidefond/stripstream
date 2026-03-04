import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SearchService } from "@/lib/services/search.service";
import { AppError, getErrorMessage } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? Number(limitParam) : Number.NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, MAX_LIMIT))
      : DEFAULT_LIMIT;

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ series: [], books: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const results = await SearchService.globalSearch(query, limit);

    return NextResponse.json(
      {
        series: results.series.map((series) => ({
          id: series.id,
          title: series.metadata.title,
          libraryId: series.libraryId,
          booksCount: series.booksCount,
          href: `/series/${series.id}`,
          coverUrl: `/api/komga/images/series/${series.id}/thumbnail`,
        })),
        books: results.books.map((book) => ({
          id: book.id,
          title: book.metadata.title || book.name,
          seriesTitle: book.seriesTitle,
          seriesId: book.seriesId,
          href: `/books/${book.id}`,
          coverUrl: `/api/komga/images/books/${book.id}/thumbnail`,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Search fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.SERIES.FETCH_ERROR,
          name: "Search fetch error",
          message: getErrorMessage(ERROR_CODES.SERIES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
