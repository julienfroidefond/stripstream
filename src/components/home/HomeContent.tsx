import { MediaRow } from "./MediaRow";
import type { HomeData } from "@/types/home";

interface HomeContentProps {
  data: HomeData;
}

export function HomeContent({ data }: HomeContentProps) {
  return (
    <div className="space-y-10 pb-2">
      {data.ongoingBooks && data.ongoingBooks.length > 0 && (
        <MediaRow
          titleKey="home.sections.continue_reading"
          items={data.ongoingBooks}
          iconName="BookOpen"
          featuredHeader
        />
      )}

      {data.ongoing && data.ongoing.length > 0 && (
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

      {data.onDeck && data.onDeck.length > 0 && (
        <MediaRow
          titleKey="home.sections.up_next"
          items={data.onDeck}
          iconName="Clock"
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
