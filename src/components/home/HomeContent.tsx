import { MediaRow } from "./MediaRow";
import { ContinueReadingHero } from "./ContinueReadingHero";
import { RecommendationsRow } from "./RecommendationsRow";
import { ReadingListRow } from "./ReadingListRow";
import type { HomeData } from "@/types/home";

interface HomeContentProps {
  data: HomeData;
  isAnonymous?: boolean;
}

export function HomeContent({ data, isAnonymous = false }: HomeContentProps) {
  // Merge onDeck (next unread per series) and ongoingBooks (currently reading),
  // deduplicate by id, onDeck first
  const continueReading = (() => {
    const items = [...(data.onDeck ?? []), ...(data.ongoingBooks ?? [])];
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  })();

  const showHero = !isAnonymous && continueReading.length > 0;

  // Largest series pool we can offer the hero for name/summary lookups.
  // heroSeries first because it's fetched specifically for these books and
  // is the most reliable source of summary/genres/authors.
  const seriesPool = (() => {
    const items = [
      ...(data.heroSeries ?? []),
      ...(data.ongoing ?? []),
      ...(data.favorites ?? []),
      ...(data.latestSeries ?? []),
    ];
    const seen = new Set<string>();
    return items.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  })();

  return (
    <div className="space-y-10 pb-2">
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
    </div>
  );
}
