"use client";

import type { KomgaSeries } from "@/types/komga";
import { SeriesCover } from "@/components/ui/series-cover";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, Tag, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SeriesListProps {
  series: KomgaSeries[];
}

interface SeriesListItemProps {
  series: KomgaSeries;
}

// Utility function to get reading status info
const getReadingStatusInfo = (series: KomgaSeries, t: (key: string, options?: any) => string) => {
  if (series.booksCount === 0) {
    return {
      label: t("series.status.noBooks"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (series.booksCount === series.booksReadCount) {
    return {
      label: t("series.status.read"),
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (series.booksReadCount > 0) {
    return {
      label: t("series.status.progress", {
        read: series.booksReadCount,
        total: series.booksCount,
      }),
      className: "bg-blue-500/10 text-blue-500",
    };
  }

  return {
    label: t("series.status.unread"),
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

function SeriesListItem({ series }: SeriesListItemProps) {
  const router = useRouter();
  const { t } = useTranslate();

  const handleClick = () => {
    router.push(`/series/${series.id}`);
  };

  const isCompleted = series.booksCount === series.booksReadCount;
  const progressPercentage = series.booksCount > 0 
    ? (series.booksReadCount / series.booksCount) * 100 
    : 0;

  const statusInfo = getReadingStatusInfo(series, t);

  return (
    <div
      className={cn(
        "group relative flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        isCompleted && "opacity-75"
      )}
      onClick={handleClick}
    >
      {/* Couverture */}
      <div className="relative w-20 h-28 sm:w-24 sm:h-36 flex-shrink-0 rounded overflow-hidden bg-muted">
        <SeriesCover
          series={series}
          alt={t("series.coverAlt", { title: series.metadata.title })}
          className="w-full h-full"
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Titre */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg line-clamp-2 hover:text-primary transition-colors">
              {series.metadata.title}
            </h3>
          </div>
          
          {/* Badge de statut */}
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex-shrink-0", statusInfo.className)}>
            {statusInfo.label}
          </span>
        </div>

        {/* Résumé */}
        {series.metadata.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 hidden sm:block">
            {series.metadata.summary}
          </p>
        )}

        {/* Métadonnées */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Nombre de livres */}
          <div className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>
              {series.booksCount === 1 
                ? t("series.book", { count: 1 })
                : t("series.books", { count: series.booksCount })}
            </span>
          </div>

          {/* Auteurs */}
          {series.booksMetadata?.authors && series.booksMetadata.authors.length > 0 && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">
                {series.booksMetadata.authors.map(a => a.name).join(", ")}
              </span>
            </div>
          )}

          {/* Date de création */}
          {series.created && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(series.created)}</span>
            </div>
          )}

          {/* Genres */}
          {series.metadata.genres && series.metadata.genres.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span className="line-clamp-1">
                {series.metadata.genres.slice(0, 3).join(", ")}
                {series.metadata.genres.length > 3 && ` +${series.metadata.genres.length - 3}`}
              </span>
            </div>
          )}

          {/* Tags */}
          {series.metadata.tags && series.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span className="line-clamp-1">
                {series.metadata.tags.slice(0, 3).join(", ")}
                {series.metadata.tags.length > 3 && ` +${series.metadata.tags.length - 3}`}
              </span>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {series.booksCount > 0 && !isCompleted && series.booksReadCount > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% {t("series.completed")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SeriesList({ series }: SeriesListProps) {
  const { t } = useTranslate();

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("series.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {series.map((seriesItem) => (
        <SeriesListItem key={seriesItem.id} series={seriesItem} />
      ))}
    </div>
  );
}

