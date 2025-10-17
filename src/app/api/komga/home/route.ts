import { NextResponse } from "next/server";
import { HomeService } from "@/lib/services/home.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
export const revalidate = 60;

export async function GET() {
  try {
    const data = await HomeService.getHomeData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error("API Home - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Home data fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ? 404 : 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.KOMGA.SERVER_UNREACHABLE,
          name: "Home data fetch error",
          message: getErrorMessage(ERROR_CODES.KOMGA.SERVER_UNREACHABLE),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await HomeService.invalidateHomeCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Home - Erreur lors de l'invalidation du cache:", error);
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

