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
    load: async ({ provider, providerType }) => {
      const [items, favoriteIds] = await Promise.all([
        getInProgressItems(provider),
        FavoriteService.getAllFavoriteIds().catch(() => []),
      ]);

      // La mise de côté est une fonctionnalité Stripstream : Komga n'expose pas
      // d'équivalent et le bouton doit rester absent de son interface.
      return {
        items,
        favoriteIds,
        canShelve: providerType === "stripstream",
      };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      anonymousEmpty={() => (
        <InProgressContent items={[]} favoriteIds={[]} canShelve={false} />
      )}
      ready={({ items, favoriteIds, canShelve }) => (
        <InProgressContent items={items} favoriteIds={favoriteIds} canShelve={canShelve} />
      )}
    />
  );
}
