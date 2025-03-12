import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const body = await request.json();
    const bookId: string = (await params).bookId;

    console.log("Route API - Données reçues:", { bookId, body });

    // Validation du format de l'objet
    if (!body.device || !body.device.id || !body.device.name) {
      console.log("Route API - Validation échouée: device est invalide");
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "EPUB Progress update error",
            message: "L'objet device est invalide ou incomplet",
          },
        },
        { status: 400 }
      );
    }

    if (!body.locator || !body.locator.href || !body.locator.type) {
      console.log("Route API - Validation échouée: locator est invalide");
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "EPUB Progress update error",
            message: "L'objet locator est invalide ou incomplet",
          },
        },
        { status: 400 }
      );
    }

    if (!body.modified) {
      console.log("Route API - Validation échouée: modified est requis");
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR,
            name: "EPUB Progress update error",
            message: "Le champ modified est requis",
          },
        },
        { status: 400 }
      );
    }

    // Extraire les valeurs nécessaires pour le service
    const totalProgression = body.locator.locations?.totalProgression || 0;
    const position = body.locator.locations?.position || 0;
    const href = body.locator.href;
    const modified = body.modified;
    const deviceId = body.device.id;
    const deviceName = body.device.name;

    console.log("Route API - Appel du service:", {
      bookId,
      totalProgression,
      position,
      href,
      modified,
      deviceId,
      deviceName,
    });

    // Transmettre directement l'objet complet à l'API Komga
    await BookService.updateEpubProgression(
      bookId,
      totalProgression,
      position,
      href,
      modified,
      deviceId,
      deviceName
    );

    console.log("Route API - Progression mise à jour avec succès");
    return NextResponse.json({ message: "📖 Progression EPUB mise à jour avec succès" });
  } catch (error) {
    console.error("Route API - Erreur lors de la mise à jour de la progression EPUB:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "EPUB Progress update error",
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
          name: "EPUB Progress update error",
          message: getErrorMessage(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
