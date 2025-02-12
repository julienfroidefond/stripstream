"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";

interface SeriesHeaderProps {
  series: KomgaSeries;
  serverUrl: string;
}

export function SeriesHeader({ series, serverUrl }: SeriesHeaderProps) {
  const [languageDisplay, setLanguageDisplay] = useState<string>(series.metadata.language);

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

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Couverture */}
      <div className="w-48 shrink-0">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          <Image
            src={`/api/komga/images/series/${series.id}/thumbnail`}
            alt={`Couverture de ${series.metadata.title}`}
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Informations */}
      <div className="flex-1 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{series.metadata.title}</h1>
          {series.metadata.status && (
            <span
              className={`mt-2 inline-block px-2 py-1 rounded-full text-xs ${
                series.metadata.status === "ENDED"
                  ? "bg-green-500/10 text-green-500"
                  : series.metadata.status === "ONGOING"
                  ? "bg-blue-500/10 text-blue-500"
                  : series.metadata.status === "ABANDONED"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-yellow-500/10 text-yellow-500"
              }`}
            >
              {series.metadata.status === "ENDED"
                ? "Terminé"
                : series.metadata.status === "ONGOING"
                ? "En cours"
                : series.metadata.status === "ABANDONED"
                ? "Abandonné"
                : "En pause"}
            </span>
          )}
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
