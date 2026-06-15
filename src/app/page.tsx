import { Suspense } from "react";
import { getProvider } from "@/lib/providers/provider.factory";
import {
  HomeDeferredContent,
  HomeDeferredContentSkeleton,
  HomePrimaryContent,
} from "@/components/home/HomeContent";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { FavoriteService } from "@/lib/services/favorite.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { redirect } from "next/navigation";
import type { HomeDeferredData } from "@/types/home";
import type { NormalizedSeries } from "@/lib/providers/types";

export default async function HomePage() {
  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const homePrimaryPromise = provider.getHomePrimaryData();
    const homeDeferredPromise = provider.getHomeDeferredData();
    const recommendationsPromise = provider.getRecommendations().catch(() => []);

    const [homePrimaryData, favorites, preferences] = await Promise.all([
      homePrimaryPromise,
      FavoriteService.listFavorites(),
      PreferencesService.getPreferences().catch(() => null),
    ]);

    const isAnonymous = preferences?.anonymousMode ?? false;

    return (
      <HomeClientWrapper>
        <div className="space-y-10 pb-2">
          <HomePrimaryContent
            data={{
              ...homePrimaryData,
              favorites,
            }}
            isAnonymous={isAnonymous}
          />
          <Suspense fallback={<HomeDeferredContentSkeleton />}>
            <HomeDeferredSections
              homeDeferredPromise={homeDeferredPromise}
              recommendationsPromise={recommendationsPromise}
              isAnonymous={isAnonymous}
            />
          </Suspense>
        </div>
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

interface HomeDeferredSectionsProps {
  homeDeferredPromise: Promise<HomeDeferredData>;
  recommendationsPromise: Promise<NormalizedSeries[]>;
  isAnonymous: boolean;
}

async function HomeDeferredSections({
  homeDeferredPromise,
  recommendationsPromise,
  isAnonymous,
}: HomeDeferredSectionsProps) {
  try {
    const [homeDeferredData, recommendations] = await Promise.all([
      homeDeferredPromise.catch(() => null),
      isAnonymous ? Promise.resolve([]) : recommendationsPromise,
    ]);

    if (!homeDeferredData) {
      return null;
    }

    return (
      <HomeDeferredContent
        data={{
          ...homeDeferredData,
          recommendations,
        }}
        isAnonymous={isAnonymous}
      />
    );
  } catch {
    return null;
  }
}
