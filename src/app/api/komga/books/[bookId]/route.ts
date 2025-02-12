import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export async function GET(request: Request, { params }: { params: { bookId: string } }) {
  try {
    const data = await BookService.getBook(params.bookId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Books - Erreur:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération du tome" }, { status: 500 });
  }
}
