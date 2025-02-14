import { NextResponse } from "next/server";
import { FavoriteService } from "@/lib/services/favorite.service";

export async function GET() {
  try {
    const favoriteIds = await FavoriteService.getAllFavoriteIds();
    return NextResponse.json(favoriteIds);
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des favoris" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { seriesId } = await request.json();
    await FavoriteService.addToFavorites(seriesId);
    return NextResponse.json({ message: "Favori ajouté avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'ajout du favori:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du favori" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { seriesId } = await request.json();
    await FavoriteService.removeFromFavorites(seriesId);
    return NextResponse.json({ message: "Favori supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du favori:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression du favori" }, { status: 500 });
  }
}
