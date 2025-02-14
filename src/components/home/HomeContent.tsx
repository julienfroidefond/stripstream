"use client";

import { HeroSection } from "./HeroSection";
import { MediaRow } from "./MediaRow";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { useRouter } from "next/navigation";

interface HomeContentProps {
  data: {
    ongoing: KomgaSeries[];
    recentlyRead: KomgaBook[];
    onDeck: KomgaBook[];
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
  // console.log("HomeContent - Données reçues:", {
  //   ongoingCount: data.ongoing?.length || 0,
  //   recentlyReadCount: data.recentlyRead?.length || 0,
  //   onDeckCount: data.onDeck?.length || 0,
  // });

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section - Afficher uniquement si nous avons des séries en cours */}
      {data.ongoing && data.ongoing.length > 0 && <HeroSection series={data.ongoing} />}

      {/* Sections de contenu */}
      <div className="space-y-12">
        {data.ongoing && data.ongoing.length > 0 && (
          <MediaRow
            title="Continuer la lecture"
            items={data.ongoing}
            onItemClick={handleItemClick}
          />
        )}

        {data.onDeck && data.onDeck.length > 0 && (
          <MediaRow title="À suivre" items={data.onDeck} onItemClick={handleItemClick} />
        )}

        {data.recentlyRead && data.recentlyRead.length > 0 && (
          <MediaRow
            title="Ajouts récents"
            items={data.recentlyRead}
            onItemClick={handleItemClick}
          />
        )}
      </div>
    </main>
  );
}
