"use client";

import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import type { KomgaSeries } from "@/types/komga";

interface OptimizedHeroSeries {
  id: string;
  metadata: {
    title: string;
  };
}

interface HeroSectionProps {
  series: OptimizedHeroSeries[];
}

export function HeroSection({ series }: HeroSectionProps) {
  const { t } = useTranslate();

  // console.log("HeroSection - Séries reçues:", {
  //   count: series?.length || 0,
  //   firstSeries: series?.[0],
  // });

  return (
    <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] -mx-4 sm:-mx-8 overflow-hidden">
      {/* Grille de couvertures en arrière-plan */}
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 p-4 opacity-10">
        {series?.map((series) => (
          <div
            key={series.id}
            className="relative aspect-[2/3] bg-muted/80 backdrop-blur-md rounded-lg overflow-hidden"
          >
            <SeriesCover
              series={series as KomgaSeries}
              alt={t("home.hero.coverAlt", { title: series.metadata.title })}
              showProgressUi={false}
            />
          </div>
        ))}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background backdrop-blur-sm" />

      {/* Contenu */}
      <div className="relative h-full container flex flex-col items-center justify-center text-center space-y-2 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight">
          {t("home.hero.title")}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-[600px]">
          {t("home.hero.subtitle")}
        </p>
      </div>
    </div>
  );
}
