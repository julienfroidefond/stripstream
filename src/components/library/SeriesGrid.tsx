"use client";
import React from "react";

import type { NormalizedSeries } from "@/lib/providers/types";
import { communityScoreToTen } from "@/lib/providers/ratings";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { CircleDot, CircleCheck, CirclePause, CircleX, Star } from "lucide-react";

const seriesStatusMap = {
  ongoing: { className: "bg-blue-500/10 text-blue-500", icon: CircleDot },
  ended: { className: "bg-green-500/10 text-green-500", icon: CircleCheck },
  hiatus: { className: "bg-yellow-500/10 text-yellow-500", icon: CirclePause },
  cancelled: { className: "bg-red-500/10 text-red-500", icon: CircleX },
} as const;

interface SeriesGridProps {
  series: NormalizedSeries[];
  isCompact?: boolean;
  /** Affiche la note uniquement quand le tri par note (community_score) est actif. */
  showRating?: boolean;
}

// Utility function to get reading status info
const getReadingStatusInfo = (
  series: NormalizedSeries,
  t: (key: string, options?: { [key: string]: string | number }) => string
) => {
  if (series.bookCount === 0) {
    return {
      label: t("series.status.noBooks"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (series.bookCount === series.booksReadCount) {
    return {
      label: t("series.status.read"),
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (series.booksReadCount > 0) {
    return {
      label: t("series.status.progress", {
        read: series.booksReadCount,
        total: series.bookCount,
      }),
      className: "bg-primary/15 text-primary",
    };
  }

  return {
    label: t("series.status.unread"),
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

const SeriesGridItem = memo(function SeriesGridItem({
  series,
  isCompact,
  isAnonymous,
  showRating,
  onOpen,
}: {
  series: NormalizedSeries;
  isCompact: boolean;
  isAnonymous: boolean;
  showRating: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslate();
  const statusInfo = getReadingStatusInfo(series, t);
  const seriesStatusEntry = series.seriesStatus
    ? seriesStatusMap[series.seriesStatus as keyof typeof seriesStatusMap]
    : null;
  const displayRating = showRating ? communityScoreToTen(series.communityScore) : null;

  return (
    <button
      onClick={() => onOpen(series.id)}
      className={cn(
        "group relative aspect-2/3 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        !isAnonymous && series.bookCount === series.booksReadCount && "opacity-50",
        isCompact && "aspect-3/4"
      )}
    >
      <SeriesCover
        series={series}
        alt={t("series.coverAlt", { title: series.name })}
        isAnonymous={isAnonymous}
      />
      {displayRating !== null && (
        <div
          className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-yellow-300 backdrop-blur-xs shadow-xs"
          title={t("series.filters.sortRating")}
        >
          <Star className="h-3 w-3 fill-yellow-300" aria-hidden="true" />
          <span className="tabular-nums">{displayRating.toFixed(1)}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 translate-y-full space-y-2 bg-linear-to-t from-black via-black/75 to-transparent p-4 transition-transform duration-200 group-hover:translate-y-0">
        <h3 className="font-medium text-sm text-white line-clamp-2">{series.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {seriesStatusEntry && (
            <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${seriesStatusEntry.className}`}>
              <seriesStatusEntry.icon className="h-3 w-3" />
              {t(`series.status.${series.seriesStatus}`)}
            </span>
          )}
          {!isAnonymous && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          )}
          <span className="text-xs text-white/80">
            {t("series.books", { count: series.bookCount })}
          </span>
        </div>
      </div>
    </button>
  );
});

export function SeriesGrid({ series, isCompact = false, showRating = false }: SeriesGridProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const handleOpenSeries = useCallback(
    (id: string) => {
      router.push(`/series/${id}`);
    },
    [router]
  );

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("series.empty")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 md:gap-5",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
    >
      {series.map((seriesItem) => (
        <SeriesGridItem
          key={seriesItem.id}
          series={seriesItem}
          isCompact={isCompact}
          isAnonymous={isAnonymous}
          showRating={showRating}
          onOpen={handleOpenSeries}
        />
      ))}
    </div>
  );
}
