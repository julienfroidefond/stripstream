"use client";

import { Book, BookOpen, BookMarked, Star, StarOff } from "lucide-react";
import type { KomgaSeries } from "@/types/komga";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { RefreshButton } from "@/components/library/RefreshButton";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { useTranslate } from "@/hooks/useTranslate";
import { SeriesCover } from "@/components/ui/series-cover";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconButton } from "@/components/ui/icon-button";
import logger from "@/lib/logger";

interface SeriesHeaderProps {
  series: KomgaSeries;
  refreshSeries: (seriesId: string) => Promise<{ success: boolean; error?: string }>;
}

export const SeriesHeader = ({ series, refreshSeries }: SeriesHeaderProps) => {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const { t } = useTranslate();

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const response = await fetch("/api/komga/favorites");
        if (!response.ok) {
          throw new AppError(ERROR_CODES.FAVORITE.STATUS_CHECK_ERROR);
        }
        const favoriteIds = await response.json();
        setIsFavorite(favoriteIds.includes(series.id));
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la vérification des favoris:");
        toast({
          title: "Erreur",
          description:
            error instanceof AppError
              ? error.message
              : getErrorMessage(ERROR_CODES.FAVORITE.NETWORK_ERROR),
          variant: "destructive",
        });
      }
    };

    checkFavorite();
  }, [series.id, toast]);

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
        window.dispatchEvent(new Event("favoritesChanged"));
        toast({
          title: t(isFavorite ? "series.header.favorite.remove" : "series.header.favorite.add"),
          description: series.metadata.title,
        });
      } else if (response.status === 500) {
        throw new AppError(ERROR_CODES.FAVORITE.SERVER_ERROR);
      } else if (response.status === 404) {
        throw new AppError(ERROR_CODES.FAVORITE.UPDATE_ERROR);
      } else {
        throw new AppError(
          isFavorite ? ERROR_CODES.FAVORITE.DELETE_ERROR : ERROR_CODES.FAVORITE.ADD_ERROR
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la modification des favoris:");
      toast({
        title: "Erreur",
        description:
          error instanceof AppError
            ? error.message
            : getErrorMessage(ERROR_CODES.FAVORITE.NETWORK_ERROR),
        variant: "destructive",
      });
    }
  };

  const getReadingStatusInfo = () => {
    const { booksCount, booksReadCount, booksUnreadCount } = series;
    const booksInProgressCount = booksCount - (booksReadCount + booksUnreadCount);

    if (booksReadCount === booksCount) {
      return {
        label: t("series.header.status.read"),
        status: "success" as const,
        icon: BookMarked,
      };
    }

    if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < booksCount)) {
      return {
        label: t("series.header.status.progress", {
          read: booksReadCount,
          total: booksCount,
        }),
        status: "reading" as const,
        icon: BookOpen,
      };
    }

    return {
      label: t("series.header.status.unread"),
      status: "unread" as const,
      icon: Book,
    };
  };

  const statusInfo = getReadingStatusInfo();

  return (
    <div className="relative min-h-[300px] md:h-[300px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0">
        <SeriesCover
          series={series as KomgaSeries}
          alt={t("series.header.coverAlt", { title: series.metadata.title })}
          className="blur-sm scale-105 brightness-50"
          showProgressUi={false}
        />
      </div>

      {/* Contenu */}
      <div className="relative container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full">
          {/* Image principale */}
          <div className="relative w-[180px] aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-muted/80 backdrop-blur-md flex-shrink-0">
            <SeriesCover
              series={series as KomgaSeries}
              alt={t("series.header.coverAlt", { title: series.metadata.title })}
              showProgressUi={false}
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
              <StatusBadge status={statusInfo.status} icon={statusInfo.icon}>
                {statusInfo.label}
              </StatusBadge>
              <span className="text-sm text-white/80">
                {series.booksCount === 1 
                  ? t("series.header.books", { count: series.booksCount })
                  : t("series.header.books_plural", { count: series.booksCount })
                }
              </span>
              <IconButton
                variant="ghost"
                size="icon"
                icon={isFavorite ? Star : StarOff}
                onClick={handleToggleFavorite}
                tooltip={t(isFavorite ? "series.header.favorite.remove" : "series.header.favorite.add")}
                className="text-white hover:text-white"
                iconClassName={isFavorite ? "fill-yellow-400 text-yellow-400" : ""}
              />
              <RefreshButton libraryId={series.id} refreshLibrary={refreshSeries} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
