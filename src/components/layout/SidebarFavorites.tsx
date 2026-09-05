import { FavoriteService } from "@/lib/services/favorite.service";
import { SidebarFavoritesView } from "./SidebarFavoritesView";

export async function SidebarFavorites() {
  const currentUser = await import("@/lib/auth-utils")
    .then((m) => m.getCurrentUser())
    .catch(() => null);
  if (!currentUser) return null;

  const favorites = await FavoriteService.listFavorites().catch(() => []);
  return <SidebarFavoritesView favorites={favorites} />;
}
