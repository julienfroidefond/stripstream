import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getActiveConnection } from "@/lib/active-connection";
import { getResolvedStripstreamConfig } from "@/lib/providers/stripstream/stripstream-config-resolver";
import { StripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError, getErrorMessage } from "@/utils/errors";
import { isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

/**
 * Proxy de téléchargement du fichier source d'un tome (`books/{id}/file` côté
 * Librarian). Le corps est relayé en streaming, sans `Content-Length` : Safari
 * est capricieux avec un `Content-Length` posé au-dessus d'une réponse chunked,
 * et le chunked transfert fonctionne partout ailleurs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.AUTH.UNAUTHENTICATED } },
        { status: 401 }
      );
    }

    const userId = parseInt(user.id, 10);
    const activeConnection = await getActiveConnection(userId);
    if (activeConnection.provider !== "stripstream") {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }
    const config = await getResolvedStripstreamConfig(
      userId,
      activeConnection.configId ?? undefined
    );
    if (!config) {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }

    const client = new StripstreamClient(config.url, config.token);
    const response = await client.fetchFile(`books/${bookId}/file`);

    const headers = new Headers({ "Cache-Control": "private, no-store" });
    const contentType = response.headers.get("content-type");
    const disposition = response.headers.get("content-disposition");
    if (contentType) headers.set("Content-Type", contentType);
    if (disposition) headers.set("Content-Disposition", disposition);

    return new NextResponse(response.body, { headers });
  } catch (error) {
    if (isConnectionError(error)) {
      logger.warn({ err: error }, "Stripstream file download error (provider unreachable)");
    } else {
      logger.error({ err: error }, "Stripstream file download error");
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: getErrorMessage(error.code) } },
        { status: statusForError(error.code) }
      );
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.STRIPSTREAM.HTTP_ERROR, message: "File download error" } },
      { status: 500 }
    );
  }
}

function statusForError(code: string): number {
  if (code === ERROR_CODES.STRIPSTREAM.NOT_FOUND) return 404;
  if (code === ERROR_CODES.STRIPSTREAM.UNAUTHORIZED) return 401;
  if (code === ERROR_CODES.STRIPSTREAM.FORBIDDEN) return 403;
  return 500;
}
