import { NextRequest, NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export async function GET(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const response = await BookService.getThumbnail(params.bookId);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la miniature du livre:", error);
    return new NextResponse("Erreur lors de la récupération de la miniature", { status: 500 });
  }
}
