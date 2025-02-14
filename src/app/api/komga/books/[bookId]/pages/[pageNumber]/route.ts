import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { bookId: string; pageNumber: string } }
) {
  try {
    const response = await BookService.getPage(params.bookId, parseInt(params.pageNumber));
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
