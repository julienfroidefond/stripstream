import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";

export async function GET(request: Request, { params }: { params: { libraryId: string } }) {
  try {
    // Récupérer les paramètres de pagination et de filtre depuis l'URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "20");
    const unreadOnly = searchParams.get("unread") === "true";

    const series = await LibraryService.getLibrarySeries(params.libraryId, page, size, unreadOnly);
    return NextResponse.json(series);
  } catch (error) {
    console.error("API Library Series - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des séries" },
      { status: 500 }
    );
  }
}
