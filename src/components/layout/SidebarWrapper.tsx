import { FavoriteService } from "@/lib/services/favorite.service";
import { LibraryService } from "@/lib/services/library.service";
import { SeriesService } from "@/lib/services/series.service";

export async function SidebarWrapper() {
  // Récupérer les favoris depuis le serveur
  const favoriteIds = await FavoriteService.getAllFavoriteIds();

  // Récupérer les détails des séries favorites
  const favorites = await SeriesService.getMultipleSeries(favoriteIds);

  // Récupérer les bibliothèques
  const libraries = await LibraryService.getLibraries();

  return { favorites, libraries };
}
