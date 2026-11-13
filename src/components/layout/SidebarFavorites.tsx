import { FavoriteService } from "@/lib/services/favorite.service";
import { getProvider } from "@/lib/providers/provider.factory";
import { SidebarFavoritesView } from "./SidebarFavoritesView";

export async function SidebarFavorites() {
  const userId = await import("@/lib/auth-utils")
    .then((m) => m.getCurrentUserId())
    .catch(() => null);
  if (userId === null) return null;

  // Une panne des favoris ne doit pas casser la barre latérale, mais elle ne
  // doit pas non plus se faire passer pour « Aucun favori » (ADR 0008).
  const favorites = await getProvider()
    .then((provider) => FavoriteService.listFavorites({ userId, provider }))
    .catch(() => null);
  return (
    <SidebarFavoritesView favorites={favorites ?? []} unavailable={favorites === null} />
  );
}
