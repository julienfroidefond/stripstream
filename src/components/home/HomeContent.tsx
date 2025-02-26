import { HeroSection } from "./HeroSection";
import { MediaRow } from "./MediaRow";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { RefreshButton } from "@/components/library/RefreshButton";
import { BookOpenCheck, History, Sparkles, Clock } from "lucide-react";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
  latestSeries: KomgaSeries[];
}

interface HomeContentProps {
  data: HomeData;
  refreshHome: () => Promise<{ success: boolean; error?: string }>;
}

export function HomeContent({ data, refreshHome }: HomeContentProps) {
  // Vérification des données pour le debug
  // console.log("HomeContent - Données reçues:", {
  //   ongoingCount: data.ongoing?.length || 0,
  //   recentlyReadCount: data.recentlyRead?.length || 0,
  //   onDeckCount: data.onDeck?.length || 0,
  // });

  const optimizeSeriesData = (series: KomgaSeries[]) => {
    return series.map(({ id, metadata, booksCount, booksReadCount }) => ({
      id,
      metadata: { title: metadata.title },
      booksCount,
      booksReadCount
    }));
  };

  const optimizeHeroSeriesData = (series: KomgaSeries[]) => {
    return series.map(({ id, metadata, booksCount, booksReadCount }) => ({
      id,
      metadata: { title: metadata.title },
      booksCount,
      booksReadCount
    }));
  };

  const optimizeBookData = (books: KomgaBook[]) => {
    return books.map(({ id, metadata, readProgress, media }) => ({
      id,
      metadata: {
        title: metadata.title,
        number: metadata.number,
      },
      readProgress,
      media
    }));
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accueil</h1>
        <RefreshButton libraryId="home" refreshLibrary={refreshHome} />
      </div>
      {/* Hero Section - Afficher uniquement si nous avons des séries en cours */}
      {data.ongoing && data.ongoing.length > 0 && (
        <HeroSection series={optimizeHeroSeriesData(data.ongoing)} />
      )}

      {/* Sections de contenu */}
      <div className="space-y-12">
        {data.ongoing && data.ongoing.length > 0 && (
          <MediaRow
            title="Continuer la lecture"
            items={optimizeSeriesData(data.ongoing)}
            icon={<BookOpenCheck className="w-6 h-6" />}
          />
        )}

        {data.onDeck && data.onDeck.length > 0 && (
          <MediaRow
            title="À suivre"
            items={optimizeBookData(data.onDeck)}
            icon={<Clock className="w-6 h-6" />}
          />
        )}

        {data.latestSeries && data.latestSeries.length > 0 && (
          <MediaRow
            title="Dernières séries"
            items={optimizeSeriesData(data.latestSeries)}
            icon={<Sparkles className="w-6 h-6" />}
          />
        )}

        {data.recentlyRead && data.recentlyRead.length > 0 && (
          <MediaRow
            title="Ajouts récents"
            items={optimizeBookData(data.recentlyRead)}
            icon={<History className="w-6 h-6" />}
          />
        )}
      </div>
    </main>
  );
}
