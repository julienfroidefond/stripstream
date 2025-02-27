import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import { KomgaBookWithPages } from "@/types/komga";
export async function GET(request: Request, { params }: { params: { bookId: string } }) {
  try {
    const data: KomgaBookWithPages = await BookService.getBook(params.bookId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Books - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Book fetch error",
            message: getErrorMessage(error.code),
          } as AppError,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.NOT_FOUND,
          name: "Book fetch error",
          message: getErrorMessage(ERROR_CODES.BOOK.NOT_FOUND),
        } as AppError,
      },
      { status: 500 }
    );
  }
}
