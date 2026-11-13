import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/constants/errorCodes";
import { FavoriteService } from "@/lib/services/favorite.service";
import { getInProgressItems } from "@/lib/services/in-progress.service";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import frMessages from "@/i18n/messages/fr/common.json";
import enMessages from "@/i18n/messages/en/common.json";
import { InProgressContent } from "./InProgressContent";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value;
  const messages = locale === "en" ? enMessages : frMessages;

  return {
    title: messages.inProgress.title,
    description: messages.inProgress.description,
  };
}

export default async function InProgressPage() {
  const surface = await loadSurface({
    name: "in-progress",
    fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
    anonymous: "empty",
    load: async ({ userId, provider }) => {
      const [items, favoriteIds] = await Promise.all([
        getInProgressItems(provider),
        // Les favoris décorent la liste : leur panne ne masque pas les
        // séries en cours, mais elle est signalée (ADR 0008).
        FavoriteService.getAllFavoriteIds({ userId, provider }).catch(() => null),
      ]);

      // Le bouton « mettre de côté » ne s'affiche que si le provider déclare
      // la capacité, jamais d'après son type de connexion.
      return {
        items,
        favoriteIds: favoriteIds ?? [],
        favoritesUnavailable: favoriteIds === null,
        canShelve: provider.capabilities.shelf !== null,
      };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      anonymousEmpty={() => (
        <InProgressContent items={[]} favoriteIds={[]} canShelve={false} />
      )}
      ready={({ items, favoriteIds, favoritesUnavailable, canShelve }) => (
        <InProgressContent
          items={items}
          favoriteIds={favoriteIds}
          favoritesUnavailable={favoritesUnavailable}
          canShelve={canShelve}
        />
      )}
    />
  );
}
