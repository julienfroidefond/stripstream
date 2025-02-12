"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";

interface SeriesHeaderProps {
  series: KomgaSeries;
  serverUrl: string;
}

// Fonction utilitaire pour obtenir les informations de lecture d'une série
const getReadingStatusInfo = (series: KomgaSeries) => {
  const { booksCount, booksReadCount, booksUnreadCount } = series;
  const booksInProgressCount = booksCount - (booksReadCount + booksUnreadCount);

  if (booksReadCount === booksCount) {
    return {
      label: "Lu",
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < booksCount)) {
    return {
      label: `${booksReadCount}/${booksCount}`,
      className: "bg-blue-500/10 text-blue-500",
    };
  }

  return {
    label: "Non lu",
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

export function SeriesHeader({ series, serverUrl }: SeriesHeaderProps) {
  const [languageDisplay, setLanguageDisplay] = useState<string>(series.metadata.language);
  const [imageError, setImageError] = useState(false);
  const [readingStatus, setReadingStatus] = useState<{
    label: string;
    className: string;
  } | null>(null);

  useEffect(() => {
    setReadingStatus(getReadingStatusInfo(series));
  }, [series]);

  useEffect(() => {
    try {
      if (series.metadata.language) {
        const displayNames = new Intl.DisplayNames([navigator.language || "fr-FR"], {
          type: "language",
        });
        setLanguageDisplay(displayNames.of(series.metadata.language) || series.metadata.language);
      }
    } catch (error) {
      console.error("Erreur lors de la traduction de la langue:", error);
      setLanguageDisplay(series.metadata.language);
    }
  }, [series.metadata.language]);

  const getSeriesThumbnailUrl = (seriesId: string) => {
    return `/api/komga/images/series/${seriesId}/thumbnail`;
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Couverture */}
      <div className="w-48 shrink-0">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          {!imageError ? (
            <Image
              src={getSeriesThumbnailUrl(series.id)}
              alt={`Couverture de ${series.metadata.title}`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-12 h-12" />
            </div>
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="flex-1 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{series.metadata.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {readingStatus && (
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs ${readingStatus.className}`}
              >
                {readingStatus.label}
              </span>
            )}
          </div>
        </div>

        {series.metadata.summary && (
          <p className="text-muted-foreground">{series.metadata.summary}</p>
        )}

        <div className="space-y-1 text-sm text-muted-foreground">
          {series.metadata.publisher && (
            <div>
              <span className="font-medium">Éditeur :</span> {series.metadata.publisher}
            </div>
          )}
          {series.metadata.genres?.length > 0 && (
            <div>
              <span className="font-medium">Genres :</span> {series.metadata.genres.join(", ")}
            </div>
          )}
          {series.metadata.tags?.length > 0 && (
            <div>
              <span className="font-medium">Tags :</span> {series.metadata.tags.join(", ")}
            </div>
          )}
          {series.metadata.language && (
            <div>
              <span className="font-medium">Langue :</span> {languageDisplay}
            </div>
          )}
          {series.metadata.ageRating && (
            <div>
              <span className="font-medium">Âge recommandé :</span> {series.metadata.ageRating}+
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
