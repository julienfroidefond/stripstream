import { Suspense } from "react";
import { resolveSeriesPool } from "@/lib/resume/series-pool";
import {
  buildResumeEntries,
  mergeResumeBooks,
} from "@/lib/resume/resume-state";
import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import {
  HomeCarouselSkeleton,
  HomeHeroSkeleton,
  HomeReadingListSkeleton,
  HomeRecommendationSkeleton,
} from "@/components/home/HomeContent";
import { ContinueReadingHero } from "@/components/home/ContinueReadingHero";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { HomeWelcome } from "@/components/home/HomeWelcome";
import { MediaRow } from "@/components/home/MediaRow";
import { ReadingListRow } from "@/components/home/ReadingListRow";
import { DeferredRecommendations } from "@/components/home/DeferredRecommendations";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { FavoriteService } from "@/lib/services/favorite.service";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { Bookmark, Heart, History, LibraryBig, Sparkles } from "lucide-react";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";
import type { HomePrimaryData } from "@/types/home";

const HOMEPAGE_INITIAL_QUERY_LIMIT = HOME_FEED_PAGE_SIZE + 1;

interface HomeFeedState<T> {
  data: T;
  failed: boolean;
}

function settleHomeFeed<T>(promise: Promise<T>, fallback: T): Promise<HomeFeedState<T>> {
  return promise.then(
    (data) => ({ data, failed: false }),
    () => ({ data: fallback, failed: true })
  );
}

export default function HomePage() {
  return (
    <HomeClientWrapper>
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeStreamingContent />
      </Suspense>
    </HomeClientWrapper>
  );
}

async function HomeStreamingContent() {
  const surface = await loadSurface({
    name: "home",
    fallbackCode: ERROR_CODES.HOME.FETCH_ERROR,
    missingProvider: "unavailable",
    load: async ({ provider, isAnonymous }) => {
      const continueReadingPromise = settleHomeFeed(
        provider.getHomeContinueReadingData(HOMEPAGE_INITIAL_QUERY_LIMIT),
        null
      );
      const ongoingPromise = settleHomeFeed(
        provider.getHomeOngoingSeries(HOMEPAGE_INITIAL_QUERY_LIMIT),
        []
      );
      const favoritesPromise = FavoriteService.listFavorites().catch(() => []);
      const readingListsPromise = settleHomeFeed(provider.getReadingLists(), []);
      const latestSeriesPromise = settleHomeFeed(
        provider.getHomeLatestSeries(HOMEPAGE_INITIAL_QUERY_LIMIT),
        []
      );
      const recentlyReadPromise = settleHomeFeed(
        provider.getHomeRecentlyRead(HOMEPAGE_INITIAL_QUERY_LIMIT),
        []
      );

      return {
        isAnonymous,
        continueReadingPromise,
        ongoingPromise,
        favoritesPromise,
        readingListsPromise,
        latestSeriesPromise,
        recentlyReadPromise,
      };
    },
  });

  if (surface.status === "unavailable") return <HomeWelcome />;

  if (surface.status !== "ready") {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage
          errorCode={surface.status === "error" ? surface.code : ERROR_CODES.HOME.FETCH_ERROR}
        />
      </main>
    );
  }

  const {
    isAnonymous,
    continueReadingPromise,
    ongoingPromise,
    favoritesPromise,
    readingListsPromise,
    latestSeriesPromise,
    recentlyReadPromise,
  } = surface.data;

  return (
    <div className="space-y-10 pb-2">
      <Suspense fallback={null}>
        <HomeProviderErrorState
          feedPromises={[
            continueReadingPromise,
            ongoingPromise,
            readingListsPromise,
            latestSeriesPromise,
            recentlyReadPromise,
          ]}
        />
      </Suspense>
      <Suspense fallback={<HomeHeroSkeleton />}>
        <ContinueReadingSection
          provider={surface.context.provider}
          continueReadingPromise={continueReadingPromise}
          ongoingPromise={ongoingPromise}
          isAnonymous={isAnonymous}
        />
      </Suspense>

      <Suspense fallback={<HomeCarouselSkeleton icon={LibraryBig} />}>
        <OngoingSection ongoingPromise={ongoingPromise} isAnonymous={isAnonymous} />
      </Suspense>

      <Suspense fallback={<HomeCarouselSkeleton icon={Heart} />}>
        <FavoritesSection favoritesPromise={favoritesPromise} />
      </Suspense>

      <Suspense fallback={<HomeRecommendationSkeleton />}>
        <DeferredRecommendations isAnonymous={isAnonymous} />
      </Suspense>

      <Suspense fallback={<HomeReadingListSkeleton icon={Bookmark} />}>
        <ReadingListsSection readingListsPromise={readingListsPromise} />
      </Suspense>

      <Suspense fallback={<HomeCarouselSkeleton icon={Sparkles} />}>
        <LatestSeriesSection latestSeriesPromise={latestSeriesPromise} />
      </Suspense>

      <Suspense fallback={<HomeCarouselSkeleton icon={History} />}>
        <RecentlyReadSection recentlyReadPromise={recentlyReadPromise} />
      </Suspense>
    </div>
  );
}

interface ContinueReadingSectionProps {
  provider: IMediaProvider;
  continueReadingPromise: Promise<
    HomeFeedState<Pick<HomePrimaryData, "ongoingBooks" | "onDeck"> | null>
  >;
  ongoingPromise: Promise<HomeFeedState<NormalizedSeries[]>>;
  isAnonymous: boolean;
}

async function ContinueReadingSection({
  provider,
  continueReadingPromise,
  ongoingPromise,
  isAnonymous,
}: ContinueReadingSectionProps) {
  if (isAnonymous) return null;

  const [continueReadingState, ongoingState] = await Promise.all([
    continueReadingPromise,
    ongoingPromise,
  ]);
  const continueReadingData = continueReadingState.data;
  const ongoing = ongoingState.data;

  if (!continueReadingData) return null;

  const continueReading = mergeResumeBooks(continueReadingData);
  if (continueReading.length === 0) return null;

  // Le pool « ongoing » est borné : on résout en plus les séries des tomes
  // affichés par le hero, sinon un tome sans série connue n'affiche que son
  // numéro (nom/résumé/genres/auteurs manquants).
  const books = continueReading.slice(0, HOME_FEED_PAGE_SIZE);
  const heroSeries = await resolveSeriesPool(provider, books, ongoing);

  return (
    <ContinueReadingHero
      initialItems={buildResumeEntries(books, heroSeries)}
      initialHasMore={continueReading.length > HOME_FEED_PAGE_SIZE}
    />
  );
}

interface OngoingSectionProps {
  ongoingPromise: Promise<HomeFeedState<NormalizedSeries[]>>;
  isAnonymous: boolean;
}

async function OngoingSection({ ongoingPromise, isAnonymous }: OngoingSectionProps) {
  if (isAnonymous) return null;

  const ongoing = (await ongoingPromise).data;
  if (ongoing.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.continue_series"
      items={ongoing}
      iconName="LibraryBig"
      feed="ongoing"
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
      feed="favorites"
    />
  );
}

async function ReadingListsSection({
  readingListsPromise,
}: {
  readingListsPromise: Promise<HomeFeedState<NormalizedReadingList[]>>;
}) {
  const readingLists = (await readingListsPromise).data;
  if (readingLists.length === 0) return null;

  return <ReadingListRow lists={readingLists} />;
}

async function LatestSeriesSection({
  latestSeriesPromise,
}: {
  latestSeriesPromise: Promise<HomeFeedState<NormalizedSeries[]>>;
}) {
  const latestSeries = (await latestSeriesPromise).data;
  if (latestSeries.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.latest_series"
      items={latestSeries}
      iconName="Sparkles"
      feed="latest-series"
    />
  );
}

async function RecentlyReadSection({
  recentlyReadPromise,
}: {
  recentlyReadPromise: Promise<HomeFeedState<NormalizedBook[]>>;
}) {
  const recentlyRead = (await recentlyReadPromise).data;
  if (recentlyRead.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.recently_added"
      items={recentlyRead}
      iconName="History"
      feed="recently-read"
    />
  );
}

async function HomeProviderErrorState({
  feedPromises,
}: {
  feedPromises: Promise<HomeFeedState<unknown>>[];
}) {
  const states = await Promise.all(feedPromises);
  if (!states.every((state) => state.failed)) return null;

  return (
    <main className="container mx-auto px-4 pt-8">
      <ErrorMessage errorCode={ERROR_CODES.HOME.FETCH_ERROR} />
    </main>
  );
}

function HomePageSkeleton() {
  return (
    <div className="space-y-10 pb-2">
      <HomeHeroSkeleton />
      <HomeCarouselSkeleton icon={LibraryBig} />
      <HomeCarouselSkeleton icon={Heart} />
      <HomeRecommendationSkeleton />
      <HomeReadingListSkeleton icon={Bookmark} />
      <HomeCarouselSkeleton icon={Sparkles} />
      <HomeCarouselSkeleton icon={History} />
    </div>
  );
}
