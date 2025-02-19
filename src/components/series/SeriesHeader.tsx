"use client";

import { Book, BookOpen, BookMarked, Star, StarOff } from "lucide-react";
import { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Cover } from "@/components/ui/cover";

interface SeriesHeaderProps {
  series: KomgaSeries;
}

export const SeriesHeader = ({ series }: SeriesHeaderProps) => {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Vérifier si la série est dans les favoris
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
  }, [series.id]);

  const handleToggleFavorite = async () => {
    try {
      const response = await fetch(`/api/komga/favorites`, {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seriesId: series.id }),
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
        // Déclencher l'événement pour mettre à jour la sidebar
        window.dispatchEvent(new Event("favoritesChanged"));
        toast({
          title: !isFavorite ? "Ajouté aux favoris" : "Retiré des favoris",
          description: series.metadata.title,
        });
      } else {
        throw new Error("Erreur lors de la modification des favoris");
      }
    } catch (error) {
      console.error("Erreur lors de la modification des favoris:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris",
        variant: "destructive",
      });
    }
  };

  const getReadingStatusInfo = () => {
    const { booksCount, booksReadCount, booksUnreadCount } = series;
    const booksInProgressCount = booksCount - (booksReadCount + booksUnreadCount);

    if (booksReadCount === booksCount) {
      return {
        label: "Lu",
        className: "bg-green-500/10 text-green-500",
        icon: BookMarked,
      };
    }

    if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < booksCount)) {
      return {
        label: `${booksReadCount}/${booksCount}`,
        className: "bg-blue-500/10 text-blue-500",
        icon: BookOpen,
      };
    }

    return {
      label: "Non lu",
      className: "bg-yellow-500/10 text-yellow-500",
      icon: Book,
    };
  };

  const statusInfo = getReadingStatusInfo();

  return (
    <div className="relative min-h-[300px] md:h-[300px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0">
        <Cover
          type="series"
          id={series.id}
          alt={`Couverture de ${series.metadata.title}`}
          className="blur-sm scale-105 brightness-50"
          quality={60}
          priority
        />
      </div>

      {/* Contenu */}
      <div className="relative container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full">
          {/* Image principale */}
          <div className="relative w-[180px] aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-muted flex-shrink-0">
            <Cover
              type="series"
              id={series.id}
              alt={`Couverture de ${series.metadata.title}`}
              quality={90}
              priority
            />
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
                {isFavorite ? (
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
