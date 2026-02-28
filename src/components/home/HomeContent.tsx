import { MediaRow } from "./MediaRow";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { HomeData } from "@/types/home";

interface HomeContentProps {
  data: HomeData;
}

const optimizeSeriesData = (series: KomgaSeries[]) => {
  return series.map(({ id, metadata, booksCount, booksReadCount }) => ({
    id,
    metadata: { title: metadata.title },
    booksCount,
    booksReadCount,
  }));
};

const optimizeBookData = (books: KomgaBook[]) => {
  return books.map(({ id, metadata, readProgress, media }) => ({
    id,
    metadata: {
      title: metadata.title,
      number: metadata.number,
    },
    readProgress: readProgress || { page: 0 },
    media,
  }));
};

export function HomeContent({ data }: HomeContentProps) {
  return (
    <div className="space-y-10 pb-2">
      {data.ongoingBooks && data.ongoingBooks.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(145deg,hsl(var(--primary)/0.12),hsl(var(--background)/0.1)_45%)] p-4 sm:p-5">
          <MediaRow
            titleKey="home.sections.continue_reading"
            items={optimizeBookData(data.ongoingBooks)}
            iconName="BookOpen"
          />
        </div>
      )}

      {data.ongoing && data.ongoing.length > 0 && (
        <MediaRow
          titleKey="home.sections.continue_series"
          items={optimizeSeriesData(data.ongoing)}
          iconName="LibraryBig"
        />
      )}

      {data.onDeck && data.onDeck.length > 0 && (
        <MediaRow
          titleKey="home.sections.up_next"
          items={optimizeBookData(data.onDeck)}
          iconName="Clock"
        />
      )}

      {data.latestSeries && data.latestSeries.length > 0 && (
        <MediaRow
          titleKey="home.sections.latest_series"
          items={optimizeSeriesData(data.latestSeries)}
          iconName="Sparkles"
        />
      )}

      {data.recentlyRead && data.recentlyRead.length > 0 && (
        <MediaRow
          titleKey="home.sections.recently_added"
          items={optimizeBookData(data.recentlyRead)}
          iconName="History"
        />
      )}
    </div>
  );
}
