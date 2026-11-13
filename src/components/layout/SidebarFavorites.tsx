import { FavoriteService } from "@/lib/services/favorite.service";
import { getProvider } from "@/lib/providers/provider.factory";
import { SidebarFavoritesView } from "./SidebarFavoritesView";

export async function SidebarFavorites() {
  const userId = await import("@/lib/auth-utils")
    .then((m) => m.getCurrentUserId())
    .catch(() => null);
  if (userId === null) return null;

  const favorites = await getProvider()
    .then((provider) => FavoriteService.listFavorites({ userId, provider }))
    .catch(() => []);
  return <SidebarFavoritesView favorites={favorites} />;
}
