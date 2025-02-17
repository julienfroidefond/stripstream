import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { bookId: string; pageNumber: string } }
) {
  try {
    // Convertir le numéro de page en nombre
    const pageNumber = parseInt(params.pageNumber);
    if (isNaN(pageNumber) || pageNumber < 0) {
      return NextResponse.json({ error: "Numéro de page invalide" }, { status: 400 });
    }

    const response = await BookService.getPageThumbnail(params.bookId, pageNumber);
    return response;
  } catch (error) {
    console.error("API Book Page Thumbnail - Erreur:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération de la miniature" },
      { status: 500 }
    );
  }
}
