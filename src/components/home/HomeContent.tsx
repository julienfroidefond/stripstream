"use client";

import { HeroSection } from "./HeroSection";
import { MediaRow } from "./MediaRow";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { HomeData } from "@/types/home";
import { RefreshButton } from "@/components/library/RefreshButton";
import { History, Sparkles, Clock, LibraryBig, BookOpen } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { useEffect, useState } from "react";

interface HomeContentProps {
  data: HomeData;
  refreshHome: () => Promise<{ success: boolean; error?: string }>;
}

export function HomeContent({ data, refreshHome }: HomeContentProps) {
  const { t } = useTranslate();
  const [showHero, setShowHero] = useState(false);

  // Vérifier si la HeroSection a déjà été affichée
  useEffect(() => {
    const heroShown = localStorage.getItem("heroSectionShown");
    if (!heroShown && data.ongoing && data.ongoing.length > 0) {
      setShowHero(true);
      localStorage.setItem("heroSectionShown", "true");
    }
  }, [data.ongoing]);

  // Vérification des données pour le debug
  // logger.info("HomeContent - Données reçues:", {
  //   ongoingCount: data.ongoing?.length || 0,
  //   recentlyReadCount: data.recentlyRead?.length || 0,
  //   onDeckCount: data.onDeck?.length || 0,
  // });

  const optimizeSeriesData = (series: KomgaSeries[]) => {
    return series.map(({ id, metadata, booksCount, booksReadCount }) => ({
      id,
      metadata: { title: metadata.title },
      booksCount,
      booksReadCount,
    }));
  };

  const optimizeHeroSeriesData = (series: KomgaSeries[]) => {
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

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("home.title")}</h1>
        <RefreshButton libraryId="home" refreshLibrary={refreshHome} />
      </div>
      {/* Hero Section - Afficher uniquement si nous avons des séries en cours et si elle n'a jamais été affichée */}
      {showHero && data.ongoing && data.ongoing.length > 0 && (
        <HeroSection series={optimizeHeroSeriesData(data.ongoing)} />
      )}

      {/* Sections de contenu */}
      <div className="space-y-12">
        {data.ongoing && data.ongoing.length > 0 && (
          <MediaRow
            title={t("home.sections.continue_series")}
            items={optimizeSeriesData(data.ongoing)}
            icon={LibraryBig}
          />
        )}

        {data.ongoingBooks && data.ongoingBooks.length > 0 && (
          <MediaRow
            title={t("home.sections.continue_reading")}
            items={optimizeBookData(data.ongoingBooks)}
            icon={BookOpen}
          />
        )}

        {data.onDeck && data.onDeck.length > 0 && (
          <MediaRow
            title={t("home.sections.up_next")}
            items={optimizeBookData(data.onDeck)}
            icon={Clock}
          />
        )}

        {data.latestSeries && data.latestSeries.length > 0 && (
          <MediaRow
            title={t("home.sections.latest_series")}
            items={optimizeSeriesData(data.latestSeries)}
            icon={Sparkles}
          />
        )}

        {data.recentlyRead && data.recentlyRead.length > 0 && (
          <MediaRow
            title={t("home.sections.recently_added")}
            items={optimizeBookData(data.recentlyRead)}
            icon={History}
          />
        )}
      </div>
    </main>
  );
}
