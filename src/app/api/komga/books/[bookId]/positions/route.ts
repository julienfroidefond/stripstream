import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId: string = (await params).bookId;

    console.log("Route API - Récupération des positions EPUB:", bookId);

    // Vérifier si l'en-tête Accept est présent dans la requête
    const acceptHeader = request.headers.get("Accept");
    console.log("Route API - En-tête Accept reçu:", acceptHeader);

    const positions = await BookService.getEpubPositions(bookId);

    console.log("Route API - Positions EPUB récupérées avec succès");
    console.log(
      "Route API - Structure des positions:",
      JSON.stringify(positions).substring(0, 200) + "..."
    );

    // Vérifier si les positions sont déjà dans le bon format
    // Si les positions sont déjà dans un objet avec une propriété 'positions', les renvoyer telles quelles
    // Sinon, les encapsuler dans un objet avec une propriété 'positions'
    const formattedResponse = positions.positions ? positions : { positions };

    console.log(
      "Route API - Réponse formatée:",
      JSON.stringify(formattedResponse).substring(0, 200) + "..."
    );

    // Renvoyer les données formatées
    return NextResponse.json(formattedResponse, {
      headers: {
        "Content-Type": "application/vnd.readium.position-list+json",
      },
    });
  } catch (error) {
    console.error("Route API - Erreur lors de la récupération des positions EPUB:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "EPUB Positions fetch error",
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
          name: "EPUB Positions fetch error",
          message: getErrorMessage(ERROR_CODES.BOOK.PAGES_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
