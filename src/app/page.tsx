import { Suspense } from "react";
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
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { emptyFeedPage, type HomeFeedPage } from "@/lib/home/feed-page";
import { loadHomeFeedPage } from "@/lib/home/feed-registry";
import {
  loadContinueReadingPage,
  type ContinueReadingPage,
} from "@/lib/home/continue-reading-feed";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { Bookmark, Heart, History, LibraryBig, Sparkles } from "lucide-react";
import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";

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
      const ongoingPromise = settleHomeFeed(
        loadHomeFeedPage(provider, "ongoing", 0),
        emptyFeedPage<NormalizedSeries>()
      );
      // Le pool « ongoing » est déjà en vol : le hero le reçoit sous forme de
      // promesse pour lancer sa propre requête en parallèle, puis réutilise les
      // séries connues au lieu de les re-résoudre.
      const continueReadingPromise = settleHomeFeed(
        loadContinueReadingPage(provider, 0, {
          knownSeries: ongoingPromise.then((state) => state.data.items),
        }),
        null
      );
      const favoritesPromise = loadHomeFeedPage(
        provider,
        "favorites",
        0
      ).catch(() => emptyFeedPage<NormalizedSeries>());
      const readingListsPromise = settleHomeFeed(
        loadHomeFeedPage(provider, "reading-lists", 0),
        emptyFeedPage<NormalizedReadingList>()
      );
      const latestSeriesPromise = settleHomeFeed(
        loadHomeFeedPage(provider, "latest-series", 0),
        emptyFeedPage<NormalizedSeries>()
      );
      const recentlyReadPromise = settleHomeFeed(
        loadHomeFeedPage(provider, "recently-read", 0),
        emptyFeedPage<NormalizedBook>()
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

  return (
    <SurfaceBoundary
      surface={surface}
      unavailable={() => <HomeWelcome />}
      ready={(data) => {
        const {
          isAnonymous,
          continueReadingPromise,
          ongoingPromise,
          favoritesPromise,
          readingListsPromise,
          latestSeriesPromise,
          recentlyReadPromise,
        } = data;

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
                continueReadingPromise={continueReadingPromise}
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
      }}
    />
  );
}

interface ContinueReadingSectionProps {
  continueReadingPromise: Promise<HomeFeedState<ContinueReadingPage | null>>;
  isAnonymous: boolean;
}

async function ContinueReadingSection({
  continueReadingPromise,
  isAnonymous,
}: ContinueReadingSectionProps) {
  if (isAnonymous) return null;

  const page = (await continueReadingPromise).data;
  if (!page || page.items.length === 0) return null;

  return (
    <ContinueReadingHero
      initialItems={page.items}
      initialHasMore={page.hasMore}
    />
  );
}

interface OngoingSectionProps {
  ongoingPromise: Promise<HomeFeedState<HomeFeedPage<"ongoing">>>;
  isAnonymous: boolean;
}

async function OngoingSection({ ongoingPromise, isAnonymous }: OngoingSectionProps) {
  if (isAnonymous) return null;

  const ongoing = (await ongoingPromise).data;
  if (ongoing.items.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.continue_series"
      items={ongoing.items}
      initialHasMore={ongoing.hasMore}
      iconName="LibraryBig"
      feed="ongoing"
    />
  );
}

async function FavoritesSection({
  favoritesPromise,
}: {
  favoritesPromise: Promise<HomeFeedPage<"favorites">>;
}) {
  const favorites = await favoritesPromise;
  if (favorites.items.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.favorites"
      items={favorites.items}
      initialHasMore={favorites.hasMore}
      iconName="Heart"
      feed="favorites"
    />
  );
}

async function ReadingListsSection({
  readingListsPromise,
}: {
  readingListsPromise: Promise<HomeFeedState<HomeFeedPage<"reading-lists">>>;
}) {
  const readingLists = (await readingListsPromise).data;
  if (readingLists.items.length === 0) return null;

  return (
    <ReadingListRow
      lists={readingLists.items}
      initialHasMore={readingLists.hasMore}
    />
  );
}

async function LatestSeriesSection({
  latestSeriesPromise,
}: {
  latestSeriesPromise: Promise<HomeFeedState<HomeFeedPage<"latest-series">>>;
}) {
  const latestSeries = (await latestSeriesPromise).data;
  if (latestSeries.items.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.latest_series"
      items={latestSeries.items}
      initialHasMore={latestSeries.hasMore}
      iconName="Sparkles"
      feed="latest-series"
    />
  );
}

async function RecentlyReadSection({
  recentlyReadPromise,
}: {
  recentlyReadPromise: Promise<HomeFeedState<HomeFeedPage<"recently-read">>>;
}) {
  const recentlyRead = (await recentlyReadPromise).data;
  if (recentlyRead.items.length === 0) return null;

  return (
    <MediaRow
      titleKey="home.sections.recently_added"
      items={recentlyRead.items}
      initialHasMore={recentlyRead.hasMore}
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
