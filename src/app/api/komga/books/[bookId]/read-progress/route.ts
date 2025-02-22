import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";

export async function PATCH(request: Request, { params }: { params: { bookId: string } }) {
  try {
    const { page, completed } = await request.json();

    if (typeof page !== "number") {
      return NextResponse.json(
        { error: "Le numéro de page est requis et doit être un nombre" },
        { status: 400 }
      );
    }

    await BookService.updateReadProgress(params.bookId, page, completed);
    return NextResponse.json({ message: "Progression mise à jour avec succès" });
  } catch (error) {
    console.error("API Read Progress - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la progression" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: Request, { params }: { params: { bookId: string } }) {
  try {
    await BookService.updateReadProgress(params.bookId, 1, false);
    return NextResponse.json({ message: "Progression supprimée avec succès" });
  } catch (error) {
    console.error("API Delete Read Progress - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la progression" },
      { status: 500 }
    );
  }
}
