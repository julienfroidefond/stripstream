import { NextRequest, NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export async function PATCH(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { page, completed } = await request.json();

    if (typeof page !== "number") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            message: ERROR_MESSAGES[ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR],
          },
        },
        { status: 400 }
      );
    }

    await BookService.updateReadProgress(params.bookId, page, completed);
    return NextResponse.json({ message: "📖 Progression mise à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la progression:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    await BookService.deleteReadProgress(params.bookId);
    return NextResponse.json({ message: "🗑️ Progression supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la progression:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
