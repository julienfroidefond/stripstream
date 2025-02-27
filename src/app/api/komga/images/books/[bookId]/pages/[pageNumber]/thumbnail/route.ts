import { NextRequest, NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string; pageNumber: string } }
) {
  try {
    // Convertir le numéro de page en nombre
    const pageNumber: number = parseInt(params.pageNumber);
    if (isNaN(pageNumber) || pageNumber < 0) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
            message: getErrorMessage(ERROR_CODES.BOOK.PAGES_FETCH_ERROR),
          },
        },
        { status: 400 }
      );
    }

    const response = await BookService.getPageThumbnail(params.bookId, pageNumber);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la miniature de la page:", error);
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
          code: ERROR_CODES.IMAGE.FETCH_ERROR,
          message: getErrorMessage(ERROR_CODES.IMAGE.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
