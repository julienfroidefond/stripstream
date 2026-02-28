import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

const HOME_CACHE_TAG = "home-data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId: string = (await params).bookId;

    // Handle empty or invalid body (can happen when request is aborted during navigation)
    let body: { page?: unknown; completed?: boolean };
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          {
            error: {
              code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
              name: "Progress update error",
              message: "Empty request body",
            },
          },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "Progress update error",
            message: "Invalid JSON body",
          },
        },
        { status: 400 }
      );
    }

    const { page, completed } = body;

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

    // Invalider le cache de la home via le tag
    revalidateTag(HOME_CACHE_TAG, "max");

    return NextResponse.json({ message: "📖 Progression mise à jour avec succès" });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour de la progression:");
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId: string = (await params).bookId;

    await BookService.deleteReadProgress(bookId);

    // Invalider le cache de la home via le tag
    revalidateTag(HOME_CACHE_TAG, "max");

    return NextResponse.json({ message: "🗑️ Progression supprimée avec succès" });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression de la progression:");
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
