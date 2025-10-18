import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const libraryIds = searchParams.get("libraryIds")?.split(",") || [];

    if (libraryIds.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.LIBRARY.FETCH_ERROR,
            message: "Au moins une bibliothèque doit être sélectionnée",
          },
        },
        { status: 400 }
      );
    }

    const bookId = await BookService.getRandomBookFromLibraries(libraryIds);
    return NextResponse.json({ bookId });
  } catch (error) {
    console.error("Erreur lors de la récupération d'un livre aléatoire:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
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
          message: getErrorMessage(ERROR_CODES.SERIES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

