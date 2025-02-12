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
    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json({ error: "Numéro de page invalide" }, { status: 400 });
    }

    const response = await BookService.getPage(params.bookId, pageNumber);
    const buffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("API Book Page - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la page" },
      { status: 500 }
    );
  }
}
