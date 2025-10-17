import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
export const revalidate = 60;

const DEFAULT_PAGE_SIZE = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  try {
    const libraryId: string = (await params).libraryId;
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || String(DEFAULT_PAGE_SIZE));
    const unreadOnly = searchParams.get("unread") === "true";
    const search = searchParams.get("search") || undefined;

    const [series, library] = await Promise.all([
      LibraryService.getLibrarySeries(libraryId, page, size, unreadOnly, search),
      LibraryService.getLibrary(libraryId)
    ]);

    return NextResponse.json(
      { series, library },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    console.error("API Library Series - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Library series fetch error",
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
          name: "Library series fetch error",
          message: getErrorMessage(ERROR_CODES.SERIES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  try {
    const libraryId: string = (await params).libraryId;
    
    await LibraryService.invalidateLibrarySeriesCache(libraryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Library Cache Invalidation - Erreur:", error);
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

