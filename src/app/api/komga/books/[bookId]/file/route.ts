import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { KomgaBookService } from "@/lib/services/komga/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError, getErrorMessage } from "@/utils/errors";
import { isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

/**
 * Proxy de téléchargement du fichier source d'un livre Komga
 * (`/api/v1/books/{id}/file`). Même contrat que la route Stripstream : streaming,
 * en-têtes de contenu relayés, pas de `Content-Length` (voir la route Stripstream).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const response = await KomgaBookService.streamFile(bookId);

    const headers = new Headers({ "Cache-Control": "private, no-store" });
    const contentType = response.headers.get("content-type");
    const disposition = response.headers.get("content-disposition");
    if (contentType) headers.set("Content-Type", contentType);
    if (disposition) headers.set("Content-Disposition", disposition);

    return new NextResponse(response.body, { headers });
  } catch (error) {
    if (isConnectionError(error)) {
      logger.warn({ err: error }, "Komga file download error (provider unreachable)");
    } else {
      logger.error({ err: error }, "Komga file download error");
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: getErrorMessage(error.code) } },
        { status: statusForError(error.code) }
      );
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.KOMGA.HTTP_ERROR, message: "File download error" } },
      { status: 500 }
    );
  }
}

function statusForError(code: string): number {
  if (code === ERROR_CODES.AUTH.UNAUTHENTICATED) return 401;
  if (code === ERROR_CODES.KOMGA.NOT_FOUND) return 404;
  if (code === ERROR_CODES.KOMGA.UNAUTHORIZED) return 401;
  if (code === ERROR_CODES.KOMGA.FORBIDDEN) return 403;
  return 500;
}
