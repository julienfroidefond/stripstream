import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/constants/errorCodes";
import { FavoriteService } from "@/lib/services/favorite.service";
import { getInProgressItems } from "@/lib/services/in-progress.service";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
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

  if (surface.status === "anonymous-empty") {
    return <InProgressContent items={[]} favoriteIds={[]} canShelve={false} />;
  }

  if (surface.status !== "ready") {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage
          errorCode={surface.status === "error" ? surface.code : ERROR_CODES.SERIES.FETCH_ERROR}
        />
      </main>
    );
  }

  const { items, favoriteIds, canShelve } = surface.data;

  return <InProgressContent items={items} favoriteIds={favoriteIds} canShelve={canShelve} />;
}
