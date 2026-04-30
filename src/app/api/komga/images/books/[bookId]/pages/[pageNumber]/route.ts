import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import { findHttpStatus } from "@/utils/image-errors";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  try {
    const { bookId, pageNumber } = await params;

    const response = await BookService.getPage(bookId, parseInt(pageNumber));
    return response;
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération de la page du livre:");

    // Chercher un status HTTP 404 dans la chaîne d'erreurs
    const httpStatus = findHttpStatus(error);

    if (httpStatus === 404) {
      const { bookId, pageNumber } = await params;
       
      logger.info(`📷 Page ${pageNumber} not found for book: ${bookId}`);
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.IMAGE.FETCH_ERROR,
            name: "Image not found",
            message: "Image not found",
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Image fetch error",
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
          name: "Image fetch error",
          message: getErrorMessage(ERROR_CODES.IMAGE.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
