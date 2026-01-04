import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const response = await BookService.getFile(bookId);

    // Stream the file directly to the client
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Length": response.headers.get("Content-Length") || "",
        "Content-Disposition": response.headers.get("Content-Disposition") || "",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "API Books File - Erreur:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Book file fetch error",
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
          name: "Book file fetch error",
          message: getErrorMessage(ERROR_CODES.BOOK.NOT_FOUND),
        } as AppError,
      },
      { status: 500 }
    );
  }
}

