import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  getActiveProviderType,
  getProvider,
} from "@/lib/providers/provider.factory";
import { FavoriteService } from "@/lib/services/favorite.service";
import { getInProgressItems } from "@/lib/services/in-progress.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { AppError } from "@/utils/errors";
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
  const [provider, preferences, providerType] = await Promise.all([
    getProvider(),
    PreferencesService.getPreferences().catch(() => null),
    getActiveProviderType().catch(() => null),
  ]);

  if (!provider) redirect("/settings");

  // La mise de côté est une fonctionnalité Stripstream : Komga n'expose pas
  // d'équivalent et le bouton doit rester absent de son interface.
  const canShelve = providerType === "stripstream";

  // Horodatage figé une fois par rendu serveur : le client calcule les temps
  // relatifs à partir de cette valeur, sans décalage d'hydratation.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // En mode anonyme, aucune donnée de lecture ne doit être chargée côté serveur.
  if (preferences?.anonymousMode) {
    return (
      <InProgressContent
        items={[]}
        favoriteIds={[]}
        now={now}
        canShelve={false}
      />
    );
  }

  try {
    const [items, favoriteIds] = await Promise.all([
      getInProgressItems(provider),
      FavoriteService.getAllFavoriteIds().catch(() => []),
    ]);

    return (
      <InProgressContent
        items={items}
        favoriteIds={favoriteIds}
        now={now}
        canShelve={canShelve}
      />
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
        error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
    ) {
      redirect("/settings");
    }

    const errorCode =
      error instanceof AppError ? error.code : ERROR_CODES.SERIES.FETCH_ERROR;
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
