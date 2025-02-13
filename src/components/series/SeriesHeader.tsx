"use client";

import Image from "next/image";
import { ImageOff, Book, BookOpen, BookMarked } from "lucide-react";
import { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";
import { FavoriteService } from "@/lib/services/favorite.service";
import { Star, StarOff } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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
  const [readingStatus, setReadingStatus] = useState<ReadingStatusInfo>(
    getReadingStatusInfo(series)
  );
  const [isFavorite, setIsFavorite] = useState(FavoriteService.isFavorite(series.id));
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleToggleFavorite = () => {
    try {
      setIsLoading(true);
      if (isFavorite) {
        FavoriteService.removeFromFavorites(series.id);
      } else {
        FavoriteService.addToFavorites(series.id);
      }
      setIsFavorite(!isFavorite);
      if (onSeriesUpdate) {
        onSeriesUpdate({ ...series, favorite: !isFavorite });
      }
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

  const StatusIcon = readingStatus.icon;

  return (
    <div className="relative w-full min-h-[300px]">
      {/* Fond flou */}
      <div className="absolute inset-0 overflow-hidden">
        {!imageError && (
          <div className="relative w-full h-full">
            <Image
              src={`/api/komga/images/series/${series.id}/thumbnail`}
              alt=""
              fill
              className="object-cover opacity-10 blur-2xl scale-110"
              priority
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="relative container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Image de couverture */}
          <div className="shrink-0">
            {!imageError ? (
              <div className="relative">
                <Image
                  src={`/api/komga/images/series/${series.id}/thumbnail`}
                  alt={series.name}
                  width={200}
                  height={300}
                  className="rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-200"
                  onError={() => setImageError(true)}
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-[200px] h-[300px] bg-muted rounded-lg flex items-center justify-center">
                <ImageOff className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <h1 className="text-4xl font-bold">{series.name}</h1>
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavorite}
                  disabled={isLoading}
                  className={cn(
                    "hover:bg-primary/20",
                    isFavorite && "bg-yellow-500/10 hover:bg-yellow-500/20"
                  )}
                  aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  {isFavorite ? (
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  ) : (
                    <StarOff className="w-6 h-6" />
                  )}
                </Button>
              )}
            </div>

            {/* Métadonnées */}
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start text-sm">
              {series.metadata.publisher && (
                <span className="text-muted-foreground">{series.metadata.publisher}</span>
              )}
              {languageDisplay && (
                <span className="text-muted-foreground capitalize">{languageDisplay}</span>
              )}
              {series.metadata.status && (
                <span className="text-muted-foreground capitalize">
                  {series.metadata.status.toLowerCase()}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
              <div
                className={cn(
                  "px-3 py-1.5 rounded-full flex items-center gap-2",
                  readingStatus.className
                )}
              >
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{readingStatus.label}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{series.booksCount} tomes</span>
                <span>{series.booksReadCount} lus</span>
                <span>{series.booksInProgressCount} en cours</span>
              </div>
            </div>

            {/* Description */}
            {series.metadata.summary && (
              <p className="text-muted-foreground line-clamp-3 max-w-2xl">
                {series.metadata.summary}
              </p>
            )}

            {/* Tags et genres */}
            {(series.metadata.tags?.length > 0 || series.metadata.genres?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {[...(series.metadata.genres || []), ...(series.metadata.tags || [])].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
