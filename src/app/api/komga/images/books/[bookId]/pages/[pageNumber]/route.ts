import { NextRequest, NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string; pageNumber: string } }
) {
  try {
    const response = await BookService.getPage(params.bookId, parseInt(params.pageNumber));
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la page du livre:", error);
    return new NextResponse("Erreur lors de la récupération de la page", { status: 500 });
  }
}
