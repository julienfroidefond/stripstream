"use client";

import Image from "next/image";
import { ImageOff, Book, BookOpen, BookMarked, Star, StarOff } from "lucide-react";
import { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface SeriesHeaderProps {
  series: KomgaSeries;
  onSeriesUpdate?: (series: KomgaSeries) => void;
}

interface ReadingStatusInfo {
  label: string;
  className: string;
  icon: React.ElementType;
}

// Fonction utilitaire pour obtenir les informations de lecture d'une série
const getReadingStatusInfo = (series: KomgaSeries): ReadingStatusInfo => {
  const { booksCount, booksReadCount, booksUnreadCount } = series;
  const booksInProgressCount = booksCount - (booksReadCount + booksUnreadCount);

  if (booksReadCount === booksCount) {
    return {
      label: "Lu",
      className: "bg-green-500/10 text-green-500",
      icon: BookOpen,
    };
  }

  if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < booksCount)) {
    return {
      label: `${booksReadCount}/${booksCount}`,
      className: "bg-blue-500/10 text-blue-500",
      icon: BookMarked,
    };
  }

  return {
    label: "Non lu",
    className: "bg-yellow-500/10 text-yellow-500",
    icon: Book,
  };
};

export const SeriesHeader = ({ series, onSeriesUpdate }: SeriesHeaderProps) => {
  const { toast } = useToast();
  const [languageDisplay, setLanguageDisplay] = useState<string>(series.metadata.language);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [mounted, setMounted] = useState(false);
  const statusInfo = getReadingStatusInfo(series);

  // Vérifier si la série est dans les favoris au chargement
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const response = await fetch("/api/komga/favorites");
        if (response.ok) {
          const favoriteIds = await response.json();
          setIsFavorite(favoriteIds.includes(series.id));
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des favoris:", error);
      }
    };

    checkFavorite();
    setMounted(true);
  }, [series.id]);

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

  const handleToggleFavorite = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/komga/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seriesId: series.id }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification des favoris");
      }

      setIsFavorite(!isFavorite);
      if (onSeriesUpdate) {
        onSeriesUpdate({ ...series, favorite: !isFavorite });
      }

      // Dispatch l'événement pour notifier les autres composants
      window.dispatchEvent(new Event("favoritesChanged"));

      toast({
        title: isFavorite ? "Retiré des favoris" : "Ajouté aux favoris",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[300px] md:h-[300px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      {/* Image de fond */}
      {!imageError ? (
        <>
          <ImageLoader isLoading={isLoading} />
          <Image
            src={`/api/komga/images/series/${series.id}/first-page`}
            alt={`Couverture de ${series.metadata.title}`}
            fill
            className={cn(
              "object-cover blur-sm scale-105 brightness-50 transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            sizes="100vw"
            onError={() => setImageError(true)}
            onLoad={() => setIsLoading(false)}
            quality={60}
            priority
            unoptimized
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      )}

      {/* Contenu */}
      <div className="relative container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full">
          {/* Image principale */}
          <div className="relative w-[180px] aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-muted flex-shrink-0">
            {!imageError ? (
              <>
                <ImageLoader isLoading={isLoading} />
                <Image
                  src={`/api/komga/images/series/${series.id}/first-page`}
                  alt={`Couverture de ${series.metadata.title}`}
                  fill
                  className={cn(
                    "object-cover transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100"
                  )}
                  sizes="180px"
                  onError={() => setImageError(true)}
                  onLoad={() => setIsLoading(false)}
                  quality={90}
                  priority
                  unoptimized
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="flex-1 text-white space-y-2 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold">{series.metadata.title}</h1>
            {series.metadata.summary && (
              <p className="text-white/80 line-clamp-3 text-sm md:text-base">
                {series.metadata.summary}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 justify-center md:justify-start flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 ${statusInfo.className}`}
              >
                <statusInfo.icon className="w-4 h-4" />
                {statusInfo.label}
              </span>
              <span className="text-sm text-white/80">
                {series.booksCount} tome{series.booksCount > 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                className="text-white hover:text-white"
              >
                {isFavorite ? <Star className="w-5 h-5" /> : <StarOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
