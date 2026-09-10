"use client";

import { memo } from "react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { communityScoreToTen } from "@/lib/providers/ratings";
import { SeriesCover } from "@/components/ui/series-cover";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calendar,
  Tag,
  User,
  CircleDot,
  CircleCheck,
  CirclePause,
  CircleX,
  Star,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";

interface SeriesListProps {
  series: NormalizedSeries[];
  isCompact?: boolean;
}

interface SeriesListItemProps {
  series: NormalizedSeries;
  isCompact?: boolean;
}

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

const seriesStatusMap = {
  ongoing: { className: "bg-blue-500/10 text-blue-500", icon: CircleDot },
  ended: { className: "bg-green-500/10 text-green-500", icon: CircleCheck },
  hiatus: { className: "bg-yellow-500/10 text-yellow-500", icon: CirclePause },
  cancelled: { className: "bg-red-500/10 text-red-500", icon: CircleX },
} as const;

const RatingBadge = ({
  value,
  compact,
  label,
}: {
  value: number;
  compact?: boolean;
  label: string;
}) => (
  <Badge
    variant="secondary"
    className={cn(
      "pointer-events-none shrink-0 gap-1 border-yellow-500/20 bg-yellow-500/10 text-yellow-600 transition-colors dark:text-yellow-400",
      compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
    )}
    title={label}
  >
    <Star
      className={cn(
        "fill-yellow-500 text-yellow-500",
        compact ? "h-2.5 w-2.5" : "h-3 w-3"
      )}
      aria-hidden="true"
    />
    <span className="tabular-nums font-semibold">{value.toFixed(1)}</span>
    {!compact && (
      <span className="font-normal text-yellow-600/70 dark:text-yellow-400/70">
        /10
      </span>
    )}
  </Badge>
);

const SeriesListItem = memo(function SeriesListItem({
  series,
  isCompact = false,
}: SeriesListItemProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const handleClick = () => {
    router.push(`/series/${series.id}`);
  };

  const isCompleted = isAnonymous
    ? false
    : series.bookCount === series.booksReadCount;
  const progressPercentage =
    series.bookCount > 0 ? (series.booksReadCount / series.bookCount) * 100 : 0;

  const statusInfo = isAnonymous ? null : getReadingStatusInfo(series, t);
  const seriesStatusEntry = series.seriesStatus
    ? seriesStatusMap[series.seriesStatus as keyof typeof seriesStatusMap]
    : null;
  const displayRating = communityScoreToTen(series.communityScore);

  if (isCompact) {
    return (
      <div
        className={cn(
          "group relative flex cursor-pointer gap-3 rounded-xl border border-border/60 bg-card/40 p-2.5 transition-all duration-200 hover:border-border hover:bg-accent/30 hover:shadow-sm",
          isCompleted && "opacity-75"
        )}
        onClick={handleClick}
      >
        <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm sm:w-14">
          <SeriesCover
            series={series}
            alt={t("series.coverAlt", { title: series.name })}
            className="h-full w-full"
            isAnonymous={isAnonymous}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
              {series.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {displayRating !== null && (
                <RatingBadge
                  value={displayRating}
                  compact
                  label={t("series.filters.sortRating")}
                />
              )}
              <div className="hidden items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                {seriesStatusEntry && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 border-current/20 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm",
                      seriesStatusEntry.className
                    )}
                  >
                    <seriesStatusEntry.icon className="h-3 w-3" />
                    {t(`series.status.${series.seriesStatus}`)}
                  </Badge>
                )}
                {statusInfo && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-current/20 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm",
                      statusInfo.className
                    )}
                  >
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {series.bookCount === 1
                ? t("series.book", { count: 1 })
                : t("series.books", { count: series.bookCount })}
            </span>
            {series.authors && series.authors.length > 0 && (
              <span className="hidden items-center gap-1 sm:inline-flex">
                <User className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{series.authors[0].name}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-4 rounded-xl border border-border/60 bg-card/40 p-3 transition-all duration-200 hover:border-border hover:bg-accent/30 hover:shadow-sm sm:p-4",
        isCompleted && "opacity-75"
      )}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm sm:w-24">
        <SeriesCover
          series={series}
          alt={t("series.coverAlt", { title: series.name })}
          className="h-full w-full"
          isAnonymous={isAnonymous}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
            {series.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {displayRating !== null && (
              <RatingBadge
                value={displayRating}
                label={t("series.filters.sortRating")}
              />
            )}
            <div className="hidden items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
              {seriesStatusEntry && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 border-current/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                    seriesStatusEntry.className
                  )}
                >
                  <seriesStatusEntry.icon className="h-3 w-3" />
                  {t(`series.status.${series.seriesStatus}`)}
                </Badge>
              )}
              {statusInfo && (
                <Badge
                  variant="outline"
                  className={cn(
                    "border-current/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {series.summary && (
          <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">
            {series.summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {series.bookCount === 1
              ? t("series.book", { count: 1 })
              : t("series.books", { count: series.bookCount })}
          </span>

          {series.authors && series.authors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {series.authors.map((a) => a.name).join(", ")}
              </span>
            </span>
          )}

          {series.createdAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(series.createdAt)}
            </span>
          )}

          {series.genres && series.genres.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {series.genres.slice(0, 3).join(", ")}
                {series.genres.length > 3 && ` +${series.genres.length - 3}`}
              </span>
            </span>
          )}

          {series.tags && series.tags.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {series.tags.slice(0, 3).join(", ")}
                {series.tags.length > 3 && ` +${series.tags.length - 3}`}
              </span>
            </span>
          )}
        </div>

        {!isAnonymous &&
          series.bookCount > 0 &&
          !isCompleted &&
          series.booksReadCount > 0 && (
            <div className="mt-auto space-y-1">
              <Progress value={progressPercentage} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">
                {Math.round(progressPercentage)}% {t("series.completed")}
              </p>
            </div>
          )}
      </div>
    </div>
  );
});

export function SeriesList({ series, isCompact = false }: SeriesListProps) {
  const { t } = useTranslate();

  if (!series.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("series.empty")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", isCompact && "space-y-2")}>
      {series.map((seriesItem) => (
        <SeriesListItem
          key={seriesItem.id}
          series={seriesItem}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
}
