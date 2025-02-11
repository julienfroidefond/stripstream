"use client";

import { HeroSection } from "./HeroSection";
import { MediaRow } from "./MediaRow";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { useRouter } from "next/navigation";

interface HomeContentProps {
  data: {
    onGoingSeries: KomgaSeries[];
    recentlyRead: KomgaBook[];
    popularSeries: KomgaSeries[];
  };
}

export function HomeContent({ data }: HomeContentProps) {
  const router = useRouter();

  const handleItemClick = (item: KomgaSeries | KomgaBook) => {
    // Si c'est une série (a la propriété booksCount), on va vers la page de la série
    if ("booksCount" in item) {
      router.push(`/series/${item.id}`);
    } else {
      // Si c'est un livre, on va directement vers la page de lecture
      router.push(`/books/${item.id}`);
    }
  };

  // Vérification des données pour le debug
  console.log("HomeContent - Données reçues:", {
    onGoingCount: data.onGoingSeries?.length || 0,
    recentlyReadCount: data.recentlyRead?.length || 0,
    popularCount: data.popularSeries?.length || 0,
  });

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section - Afficher uniquement si nous avons des séries populaires */}
      {data.popularSeries && data.popularSeries.length > 0 && (
        <HeroSection series={data.popularSeries} />
      )}

      {/* Sections de contenu */}
      <div className="space-y-12">
        {data.onGoingSeries && data.onGoingSeries.length > 0 && (
          <MediaRow
            title="Continuer la lecture"
            items={data.onGoingSeries}
            onItemClick={handleItemClick}
          />
        )}

        {data.recentlyRead && data.recentlyRead.length > 0 && (
          <MediaRow
            title="Dernières lectures"
            items={data.recentlyRead}
            onItemClick={handleItemClick}
          />
        )}

        {data.popularSeries && data.popularSeries.length > 0 && (
          <MediaRow
            title="Séries populaires"
            items={data.popularSeries}
            onItemClick={handleItemClick}
          />
        )}
      </div>
    </main>
  );
}
