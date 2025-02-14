import { FavoriteService } from "@/lib/services/favorite.service";
import { LibraryService } from "@/lib/services/library.service";

export async function SidebarWrapper() {
  // Récupérer les favoris depuis le serveur
  const favoriteIds = await FavoriteService.getAllFavoriteIds();

  // Récupérer les détails des séries favorites
  const favoritesPromises = favoriteIds.map(async (id) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/series/${id}`, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return response.json();
  });

  // Récupérer les bibliothèques
  const libraries = await LibraryService.getLibraries();

  const favorites = (await Promise.all(favoritesPromises)).filter(Boolean);

  return { favorites, libraries };
}
