"use client";

import { useMemo } from "react";
import { Library, BookOpen } from "lucide-react";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";
import { RefreshButton } from "./RefreshButton";
import { useTranslate } from "@/hooks/useTranslate";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeriesCover } from "@/components/ui/series-cover";

interface LibraryHeaderProps {
  library: KomgaLibrary;
  seriesCount: number;
  series: KomgaSeries[];
  refreshLibrary: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
}

export const LibraryHeader = ({ library, seriesCount, series, refreshLibrary }: LibraryHeaderProps) => {
  const { t } = useTranslate();

  // Mémoriser la sélection des séries pour éviter les rerenders inutiles
  const { randomSeries, backgroundSeries } = useMemo(() => {
    // Sélectionner une série aléatoire pour l'image centrale
    const random = series.length > 0 ? series[Math.floor(Math.random() * series.length)] : null;
    
    // Sélectionner une autre série aléatoire pour le fond (différente de celle du centre)
    const background = series.length > 1 
      ? series.filter(s => s.id !== random?.id)[Math.floor(Math.random() * (series.length - 1))]
      : random;
    
    return { randomSeries: random, backgroundSeries: background };
  }, [series]);

  return (
    <div className="relative min-h-[200px] md:h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      {/* Image de fond avec une série aléatoire */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/40" />
        {backgroundSeries ? (
          <SeriesCover
            series={backgroundSeries}
            alt=""
            className="w-full h-full object-cover scale-105 blur-sm opacity-30"
            showProgressUi={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}
      </div>

      {/* Contenu */}
      <div className="relative container mx-auto px-4 py-8 h-full">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start h-full">
          {/* Cover centrale avec icône overlay */}
          <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden shadow-lg flex-shrink-0">
            {randomSeries ? (
              <div className="relative w-full h-full">
                <SeriesCover
                  series={randomSeries}
                  alt={t("library.header.coverAlt", { name: library.name })}
                  className="w-full h-full object-cover"
                  showProgressUi={false}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Library className="w-10 h-10 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-primary/10 backdrop-blur-md flex items-center justify-center">
                <Library className="w-16 h-16 text-primary" />
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{library.name}</h1>
            
            <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
              <StatusBadge status="unread" icon={Library}>
                {seriesCount === 1 
                  ? t("library.header.series", { count: seriesCount })
                  : t("library.header.series_plural", { count: seriesCount })
                }
              </StatusBadge>
              
              <StatusBadge status="reading" icon={BookOpen}>
                {library.booksCount === 1 
                  ? t("library.header.books", { count: library.booksCount })
                  : t("library.header.books_plural", { count: library.booksCount })
                }
              </StatusBadge>
              
              <RefreshButton libraryId={library.id} refreshLibrary={refreshLibrary} />
            </div>

            {library.unavailable && (
              <p className="text-sm text-destructive mt-2">
                {t("library.header.unavailable")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

