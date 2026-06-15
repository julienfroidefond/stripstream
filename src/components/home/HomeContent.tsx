import { MediaRow } from "./MediaRow";
import { ContinueReadingHero } from "./ContinueReadingHero";
import { RecommendationsRow } from "./RecommendationsRow";
import { ReadingListRow } from "./ReadingListRow";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeData, HomeDeferredData, HomePrimaryData } from "@/types/home";
import { Bookmark, History, Sparkles, Wand2, type LucideIcon } from "lucide-react";

interface HomeContentProps {
  data: HomeData;
  isAnonymous?: boolean;
}

interface HomePrimaryContentProps {
  data: HomePrimaryData & Pick<HomeData, "favorites">;
  isAnonymous?: boolean;
}

interface HomeDeferredContentProps {
  data: HomeDeferredData;
  isAnonymous?: boolean;
}

function getContinueReading(data: HomePrimaryData) {
  // Merge onDeck (next unread per series) and ongoingBooks (currently reading),
  // deduplicate by id, onDeck first
  const items = [...(data.onDeck ?? []), ...(data.ongoingBooks ?? [])];
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getSeriesPool(data: HomePrimaryData & Pick<HomeData, "favorites">) {
  // Largest series pool we can offer the hero for name/summary lookups.
  // heroSeries first because it's fetched specifically for these books and
  // is the most reliable source of summary/genres/authors.
  const items = [
    ...(data.heroSeries ?? []),
    ...(data.ongoing ?? []),
    ...(data.favorites ?? []),
  ];
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export function HomePrimaryContent({ data, isAnonymous = false }: HomePrimaryContentProps) {
  const continueReading = getContinueReading(data);
  const showHero = !isAnonymous && continueReading.length > 0;
  const seriesPool = getSeriesPool(data);

  return (
    <>
      {showHero && <ContinueReadingHero books={continueReading} series={seriesPool} />}

      {!isAnonymous && data.ongoing && data.ongoing.length > 0 && (
        <MediaRow
          titleKey="home.sections.continue_series"
          items={data.ongoing}
          iconName="LibraryBig"
        />
      )}

      {data.favorites && data.favorites.length > 0 && (
        <MediaRow
          titleKey="home.sections.favorites"
          items={data.favorites}
          iconName="Heart"
        />
      )}
    </>
  );
}

export function HomeDeferredContent({ data, isAnonymous = false }: HomeDeferredContentProps) {
  return (
    <>
      {data.readingLists && data.readingLists.length > 0 && (
        <ReadingListRow lists={data.readingLists} />
      )}

      {data.latestSeries && data.latestSeries.length > 0 && (
        <MediaRow
          titleKey="home.sections.latest_series"
          items={data.latestSeries}
          iconName="Sparkles"
        />
      )}

      {data.recentlyRead && data.recentlyRead.length > 0 && (
        <MediaRow
          titleKey="home.sections.recently_added"
          items={data.recentlyRead}
          iconName="History"
        />
      )}

      {!isAnonymous && data.recommendations && data.recommendations.length > 0 && (
        <RecommendationsRow series={data.recommendations} />
      )}
    </>
  );
}

export function HomeDeferredContentSkeleton() {
  return (
    <>
      <HomeRowSkeleton icon={Bookmark} />
      <HomeRowSkeleton icon={Sparkles} />
      <HomeRowSkeleton icon={History} />
      <HomeRowSkeleton icon={Wand2} />
    </>
  );
}

function HomeRowSkeleton({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-[2/3] w-[188px] flex-shrink-0 rounded-xl sm:w-[200px]"
          />
        ))}
      </div>
    </section>
  );
}

export function HomeContent({ data, isAnonymous = false }: HomeContentProps) {
  return (
    <div className="space-y-10 pb-2">
      <HomePrimaryContent data={data} isAnonymous={isAnonymous} />
      <HomeDeferredContent data={data} isAnonymous={isAnonymous} />
    </div>
  );
}
