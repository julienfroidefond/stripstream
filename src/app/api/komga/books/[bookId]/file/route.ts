import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { bookId: string } }) {
  console.log(`[API] Début de la requête GET pour le fichier EPUB du livre ${params.bookId}`);

  try {
    const { bookId } = params;

    // Vérifier si le client accepte application/octet-stream
    const acceptHeader = request.headers.get("Accept") || "";
    console.log(`[API] En-tête Accept: ${acceptHeader}`);

    // Utiliser la méthode getEpubFile pour récupérer le fichier EPUB
    console.log(`[API] Récupération du fichier EPUB via BookService.getEpubFile...`);
    const response = await BookService.getEpubFile(bookId);
    console.log(`[API] Fichier EPUB récupéré avec succès`);

    // Extraire le contenu de la réponse
    const buffer = await response.arrayBuffer();
    const headers = response.headers;

    // Créer une nouvelle réponse avec les bons en-têtes
    console.log(`[API] Envoi de la réponse au client...`);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition":
          headers.get("Content-Disposition") || `inline; filename="${bookId}.epub"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      },
    });
  } catch (error) {
    console.error("[API] Erreur lors de la récupération du fichier EPUB:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "EPUB fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
          name: "EPUB fetch error",
          message: getErrorMessage(ERROR_CODES.BOOK.PAGES_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
