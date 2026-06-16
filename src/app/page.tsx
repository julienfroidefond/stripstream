import { Suspense } from "react";
import { getProvider } from "@/lib/providers/provider.factory";
import {
  getContinueReading,
  getSeriesPool,
  HomeCarouselSkeleton,
  HomeHeroSkeleton,
} from "@/components/home/HomeContent";
import { ContinueReadingHero } from "@/components/home/ContinueReadingHero";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { MediaRow } from "@/components/home/MediaRow";
import { ReadingListRow } from "@/components/home/ReadingListRow";
import { RecommendationsRow } from "@/components/home/RecommendationsRow";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { FavoriteService } from "@/lib/services/favorite.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { redirect } from "next/navigation";
import { Bookmark, Heart, History, LibraryBig, Sparkles, Wand2 } from "lucide-react";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { HomePrimaryData } from "@/types/home";
import type { StripstreamReadingList } from "@/types/stripstream";

export default async function HomePage() {
  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const preferences = await PreferencesService.getPreferences().catch(() => null);
    const isAnonymous = preferences?.anonymousMode ?? false;

    const continueReadingPromise = provider.getHomeContinueReadingData().catch(() => null);
    const ongoingPromise = provider.getHomeOngoingSeries().catch(() => []);
    const favoritesPromise = FavoriteService.listFavorites().catch(() => []);
    const readingListsPromise = provider.getHomeReadingLists().catch(() => []);
    const latestSeriesPromise = provider.getHomeLatestSeries().catch(() => []);
    const recentlyReadPromise = provider.getHomeRecentlyRead().catch(() => []);
    const recommendationsPromise = isAnonymous
      ? Promise.resolve([])
      : provider.getRecommendations().catch(() => []);

    return (
      <HomeClientWrapper>
        <div className="space-y-10 pb-2">
          <Suspense fallback={<HomeHeroSkeleton />}>
            <ContinueReadingSection
              continueReadingPromise={continueReadingPromise}
              ongoingPromise={ongoingPromise}
              favoritesPromise={favoritesPromise}
              isAnonymous={isAnonymous}
            />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={LibraryBig} />}>
            <OngoingSection ongoingPromise={ongoingPromise} isAnonymous={isAnonymous} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Heart} />}>
            <FavoritesSection favoritesPromise={favoritesPromise} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Bookmark} />}>
            <ReadingListsSection readingListsPromise={readingListsPromise} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Sparkles} />}>
            <LatestSeriesSection latestSeriesPromise={latestSeriesPromise} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={History} />}>
            <RecentlyReadSection recentlyReadPromise={recentlyReadPromise} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Wand2} />}>
            <RecommendationsSection
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

interface ContinueReadingSectionProps {
  continueReadingPromise: Promise<Pick<HomePrimaryData, "ongoingBooks" | "onDeck"> | null>;
  ongoingPromise: Promise<NormalizedSeries[]>;
  favoritesPromise: Promise<NormalizedSeries[]>;
  isAnonymous: boolean;
}

async function ContinueReadingSection({
  continueReadingPromise,
  ongoingPromise,
  favoritesPromise,
  isAnonymous,
}: ContinueReadingSectionProps) {
  if (isAnonymous) return null;

  const [continueReadingData, ongoing, favorites] = await Promise.all([
    continueReadingPromise,
    ongoingPromise,
    favoritesPromise,
  ]);

  if (!continueReadingData) return null;

  const continueReading = getContinueReading(continueReadingData);
  if (continueReading.length === 0) return null;

  const seriesPool = getSeriesPool({
    heroSeries: [],
    ongoing,
    favorites,
  });

  return <ContinueReadingHero books={continueReading} series={seriesPool} />;
}

interface OngoingSectionProps {
  ongoingPromise: Promise<NormalizedSeries[]>;
  isAnonymous: boolean;
}

async function OngoingSection({ ongoingPromise, isAnonymous }: OngoingSectionProps) {
  if (isAnonymous) return null;

  const ongoing = await ongoingPromise;
  if (ongoing.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.continue_series"
      items={ongoing}
      iconName="LibraryBig"
    />
  );
}

async function FavoritesSection({ favoritesPromise }: { favoritesPromise: Promise<NormalizedSeries[]> }) {
  const favorites = await favoritesPromise;
  if (favorites.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.favorites"
      items={favorites}
      iconName="Heart"
    />
  );
}

async function ReadingListsSection({
  readingListsPromise,
}: {
  readingListsPromise: Promise<StripstreamReadingList[]>;
}) {
  const readingLists = await readingListsPromise;
  if (readingLists.length === 0) return null;

  return <ReadingListRow lists={readingLists} />;
}

async function LatestSeriesSection({
  latestSeriesPromise,
}: {
  latestSeriesPromise: Promise<NormalizedSeries[]>;
}) {
  const latestSeries = await latestSeriesPromise;
  if (latestSeries.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.latest_series"
      items={latestSeries}
      iconName="Sparkles"
    />
  );
}

async function RecentlyReadSection({
  recentlyReadPromise,
}: {
  recentlyReadPromise: Promise<NormalizedBook[]>;
}) {
  const recentlyRead = await recentlyReadPromise;
  if (recentlyRead.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.recently_added"
      items={recentlyRead}
      iconName="History"
    />
  );
}

interface RecommendationsSectionProps {
  recommendationsPromise: Promise<NormalizedSeries[]>;
  isAnonymous: boolean;
}

async function RecommendationsSection({
  recommendationsPromise,
  isAnonymous,
}: RecommendationsSectionProps) {
  if (isAnonymous) return null;

  const recommendations = await recommendationsPromise;
  if (recommendations.length === 0) return null;

  return <RecommendationsRow series={recommendations} />;
}
