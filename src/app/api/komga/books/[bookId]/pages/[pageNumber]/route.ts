import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { KomgaImageService } from "@/lib/services/komga/image.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";
import { requestDeduplicationService } from "@/lib/services/request-deduplication.service";

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

    // Utiliser la déduplication pour éviter les requêtes dupliquées vers Komga
    // Si plusieurs clients demandent la même page simultanément, une seule requête est faite
    // On lit le buffer et les headers dans la déduplication pour pouvoir les partager
    // The same book/page id can exist on multiple Komga connections. Keep
    // in-flight requests isolated by the browser's active connection cookie;
    // the image service resolves the matching credentials separately.
    const activeConfigKey = request.cookies.get("stripstream-active-komga-config")?.value ?? "default";
    const deduplicationKey = `book-page:${activeConfigKey}:${bookIdParam}:${pageNumber}`;
    const { buffer, contentType } = await requestDeduplicationService.deduplicate(
      deduplicationKey,
      async () => {
        const adjusted = pageNumber - 1;
        const response = await KomgaImageService.streamImage(
          `books/${bookIdParam}/pages/${adjusted}?zero_based=true`
        );
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("Content-Type") || "image/jpeg";
        // Retourner le buffer et contentType pour que chaque requête puisse créer sa propre réponse
        return { buffer, contentType };
      }
    );

    // Cloner le buffer pour cette requête pour éviter tout partage de référence
    const clonedBuffer = buffer.slice(0);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return new NextResponse(clonedBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération de la page:");
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
