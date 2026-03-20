import { MediaRow } from "./MediaRow";
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

  return (
    <div className="space-y-10 pb-2">
      {!isAnonymous && continueReading.length > 0 && (
        <MediaRow
          titleKey="home.sections.continue_reading"
          items={continueReading}
          iconName="BookOpen"
          featuredHeader
        />
      )}

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
    </div>
  );
}
