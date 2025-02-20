import { HeroSection } from "./HeroSection";
import { MediaRow } from "./MediaRow";
import { KomgaBook, KomgaSeries } from "@/types/komga";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
}

interface HomeContentProps {
  data: HomeData;
}

export function HomeContent({ data }: HomeContentProps) {
  // Vérification des données pour le debug
  // console.log("HomeContent - Données reçues:", {
  //   ongoingCount: data.ongoing?.length || 0,
  //   recentlyReadCount: data.recentlyRead?.length || 0,
  //   onDeckCount: data.onDeck?.length || 0,
  // });

  const optimizeSeriesData = (series: KomgaSeries[]) => {
    return series.map(({ id, metadata, booksCount }) => ({
      id,
      metadata: { title: metadata.title },
      booksCount,
    }));
  };

  const optimizeHeroSeriesData = (series: KomgaSeries[]) => {
    return series.map(({ id, metadata }) => ({
      id,
      metadata: { title: metadata.title },
    }));
  };

  const optimizeBookData = (books: KomgaBook[]) => {
    return books.map(({ id, metadata }) => ({
      id,
      metadata: {
        title: metadata.title,
        number: metadata.number,
      },
    }));
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section - Afficher uniquement si nous avons des séries en cours */}
      {data.ongoing && data.ongoing.length > 0 && (
        <HeroSection series={optimizeHeroSeriesData(data.ongoing)} />
      )}

      {/* Sections de contenu */}
      <div className="space-y-12">
        {data.ongoing && data.ongoing.length > 0 && (
          <MediaRow title="Continuer la lecture" items={optimizeSeriesData(data.ongoing)} />
        )}

        {data.onDeck && data.onDeck.length > 0 && (
          <MediaRow title="À suivre" items={optimizeBookData(data.onDeck)} />
        )}

        {data.recentlyRead && data.recentlyRead.length > 0 && (
          <MediaRow title="Ajouts récents" items={optimizeBookData(data.recentlyRead)} />
        )}
      </div>
    </main>
  );
}
