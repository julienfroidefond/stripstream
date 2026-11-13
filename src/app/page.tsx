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
import type { HomeFeedItem, HomeFeedState } from "@/lib/home/feed-page";
import { loadHomeFeeds, type HomeFeedStates } from "@/lib/home/home-feeds";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { Bookmark, Heart, History, LibraryBig, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <HomeClientWrapper>
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeStreamingContent />
      </Suspense>
    </HomeClientWrapper>
  );
}

/**
 * Rendu de l'accueil. La politique (masquage anonyme, repli vide, règle
 * « tout a échoué ») vit dans `loadHomeFeeds` : la page ne fait que rendre
 * les états déjà réglés.
 */
async function HomeStreamingContent() {
  const surface = await loadSurface({
    name: "home",
    fallbackCode: ERROR_CODES.HOME.FETCH_ERROR,
    missingProvider: "unavailable",
    load: async ({ provider, isAnonymous }) =>
      loadHomeFeeds(provider, { isAnonymous }),
  });

  return (
    <SurfaceBoundary
      surface={surface}
      unavailable={() => <HomeWelcome />}
      ready={({ feeds, outage }) => (
        <div className="space-y-10 pb-2">
          <Suspense fallback={null}>
            <HomeOutage outage={outage} />
          </Suspense>
          <Suspense fallback={<HomeHeroSkeleton />}>
            <ContinueReadingSection state={feeds["continue-reading"]} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={LibraryBig} />}>
            <MediaSection
              feed="ongoing"
              state={feeds.ongoing}
              titleKey="home.sections.continue_series"
              iconName="LibraryBig"
            />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Heart} />}>
            <MediaSection
              feed="favorites"
              state={feeds.favorites}
              titleKey="home.sections.favorites"
              iconName="Heart"
            />
          </Suspense>

          <Suspense fallback={<HomeRecommendationSkeleton />}>
            <RecommendationsSection state={feeds.recommendations} />
          </Suspense>

          <Suspense fallback={<HomeReadingListSkeleton icon={Bookmark} />}>
            <ReadingListsSection state={feeds["reading-lists"]} />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={Sparkles} />}>
            <MediaSection
              feed="latest-series"
              state={feeds["latest-series"]}
              titleKey="home.sections.latest_series"
              iconName="Sparkles"
            />
          </Suspense>

          <Suspense fallback={<HomeCarouselSkeleton icon={History} />}>
            <MediaSection
              feed="recently-read"
              state={feeds["recently-read"]}
              titleKey="home.sections.recently_added"
              iconName="History"
            />
          </Suspense>
        </div>
      )}
    />
  );
}

async function ContinueReadingSection({
  state,
}: {
  state: HomeFeedStates["continue-reading"];
}) {
  const { page } = await state;
  if (page.items.length === 0) return null;

  return (
    <ContinueReadingHero
      initialItems={page.items}
      initialHasMore={page.hasMore}
    />
  );
}

type MediaFeed = "ongoing" | "favorites" | "latest-series" | "recently-read";

async function MediaSection({
  feed,
  state,
  titleKey,
  iconName,
}: {
  feed: MediaFeed;
  state: Promise<HomeFeedState<HomeFeedItem<MediaFeed>>>;
  titleKey: string;
  iconName: string;
}) {
  const { page } = await state;
  if (page.items.length === 0) return null;

  return (
    <MediaRow
      titleKey={titleKey}
      items={page.items}
      initialHasMore={page.hasMore}
      iconName={iconName}
      feed={feed}
    />
  );
}

async function RecommendationsSection({
  state,
}: {
  state: HomeFeedStates["recommendations"];
}) {
  const { status } = await state;
  return status === "deferred" ? <DeferredRecommendations /> : null;
}

async function ReadingListsSection({
  state,
}: {
  state: HomeFeedStates["reading-lists"];
}) {
  const { page } = await state;
  if (page.items.length === 0) return null;

  return <ReadingListRow lists={page.items} initialHasMore={page.hasMore} />;
}

async function HomeOutage({ outage }: { outage: Promise<boolean> }) {
  if (!(await outage)) return null;

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
