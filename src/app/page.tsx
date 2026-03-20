import { getProvider } from "@/lib/providers/provider.factory";
import { HomeContent } from "@/components/home/HomeContent";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { FavoritesService } from "@/lib/services/favorites.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const [homeData, favorites, preferences] = await Promise.all([
      provider.getHomeData(),
      FavoritesService.getFavorites(),
      PreferencesService.getPreferences().catch(() => null),
    ]);

    const data = { ...homeData, favorites };

    return (
      <HomeClientWrapper>
        <HomeContent data={data} isAnonymous={preferences?.anonymousMode ?? false} />
      </HomeClientWrapper>
    );
  } catch (error) {
    if (error instanceof AppError && (
      error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
      error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG
    )) {
      redirect("/settings");
    }

    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.HOME.FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
