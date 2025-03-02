import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export async function PATCH(request: NextRequest) {
  try {
    const { page, completed } = await request.json();
    const params = request.nextUrl.searchParams;
    const bookId: string = params.get("bookId") || "";

    if (typeof page !== "number") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "Progress update error",
            message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR),
          },
        },
        { status: 400 }
      );
    }

    await BookService.updateReadProgress(bookId, page, completed);
    return NextResponse.json({ message: "📖 Progression mise à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la progression:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Progress update error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
          name: "Progress update error",
          message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const bookId: string = params.get("bookId") || "";

    await BookService.deleteReadProgress(bookId);
    return NextResponse.json({ message: "🗑️ Progression supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la progression:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Progress delete error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR,
          name: "Progress delete error",
          message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
