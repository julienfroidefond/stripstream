"use client";

import type { NormalizedSeries } from "@/lib/providers/types";
import { communityScoreToTen } from "@/lib/providers/ratings";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { SeriesCover } from "@/components/ui/series-cover";
import { CoverCard, CoverEdge } from "@/components/ui/cover-card";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useSeriesReadingStatus } from "@/components/ui/series-reading-status";
import { CircleDot, CircleCheck, CirclePause, CircleX, Snowflake, Star } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion";

const seriesStatusMap = {
  ongoing: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: CircleDot },
  ended: { className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CircleCheck },
  hiatus: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: CirclePause },
  cancelled: { className: "bg-red-500/10 text-red-600 dark:text-red-400", icon: CircleX },
} as const;

interface SeriesGridProps {
  series: NormalizedSeries[];
  isCompact?: boolean;
  /** Affiche la note uniquement quand le tri par note (community_score) est actif. */
  showRating?: boolean;
}

const SeriesGridItem = memo(function SeriesGridItem({
  series,
  isAnonymous,
  showRating,
}: {
  series: NormalizedSeries;
  isAnonymous: boolean;
  showRating: boolean;
}) {
  const { t } = useTranslate();
  const statusInfo = useSeriesReadingStatus(series);
  const seriesStatusEntry = series.seriesStatus
    ? seriesStatusMap[series.seriesStatus as keyof typeof seriesStatusMap]
    : null;
  const StatusIcon = seriesStatusEntry?.icon;
  const displayRating = showRating ? communityScoreToTen(series.communityScore) : null;
  const isShelved = !isAnonymous && Boolean(series.shelvedAt);

  return (
    <CoverCard
      href={`/series/${series.id}`}
      ariaLabel={t("series.coverLink", { title: series.name })}
      cover={
        <>
          <SeriesCover
            series={series}
            alt={t("series.coverAlt", { title: series.name })}
            isAnonymous={isAnonymous}
          />
          <CoverEdge />
        </>
      }
      badge={
        displayRating !== null ? (
          <span
            className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-amber-600 shadow-sm ring-1 ring-border/60 backdrop-blur-sm dark:text-amber-400"
            title={t("series.filters.sortRating")}
          >
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span className="tabular-nums">{displayRating.toFixed(1)}</span>
          </span>
        ) : null
      }
    >
      <h3 className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary">
        {series.name}
      </h3>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {seriesStatusEntry && StatusIcon && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
              seriesStatusEntry.className
            )}
          >
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {t(`series.status.${series.seriesStatus}`)}
          </span>
        )}
        {!isAnonymous && (
          <span className={cn("rounded-full px-1.5 py-0.5", statusInfo.className)}>
            {statusInfo.label}
          </span>
        )}
        {isShelved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-cyan-600 dark:text-cyan-400">
            <Snowflake className="h-3 w-3" aria-hidden="true" />
            {t("series.header.shelf.badge")}
          </span>
        )}
        <span className="tabular-nums">
          {t("series.books", { count: series.bookCount })}
        </span>
      </div>
    </CoverCard>
  );
});

export function SeriesGrid({ series, isCompact = false, showRating = false }: SeriesGridProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("series.empty")}</p>
      </div>
    );
  }

  return (
    <StaggerGroup
      className={cn(
        "grid gap-x-4 gap-y-7 md:gap-x-5",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
      reveal="scroll"
      effect="settle"
      stagger={0.09}
    >
      {series.map((seriesItem) => (
        <StaggerItem key={seriesItem.id} className="relative h-full">
          <SeriesGridItem
            series={seriesItem}
            isAnonymous={isAnonymous}
            showRating={showRating}
          />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
