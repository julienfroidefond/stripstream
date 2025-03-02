import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  try {
    const { bookId: bookIdParam, pageNumber: pageNumberParam } = await params;

    const pageNumber: number = parseInt(pageNumberParam);
    if (isNaN(pageNumber) || pageNumber < 0) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.IMAGE.FETCH_ERROR,
            name: "Image fetch error",
            message: getErrorMessage(ERROR_CODES.IMAGE.FETCH_ERROR),
          },
        },
        { status: 400 }
      );
    }

    const response = await BookService.getPage(bookIdParam, pageNumber);
    const buffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la page:", error);
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
