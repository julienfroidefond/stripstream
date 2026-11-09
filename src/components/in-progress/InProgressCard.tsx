"use client";

import Link from "next/link";
import {
  BookOpen,
  Clock,
  Flame,
  PauseCircle,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeriesCover } from "@/components/ui/series-cover";
import { ProgressFill } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import {
  getBookProgressPercent,
  isPaused,
  type InProgressItem,
} from "@/lib/services/in-progress.service";
import { InProgressFavoriteButton } from "./InProgressFavoriteButton";
import { RelativeTime } from "./RelativeTime";
import { useBookLabel } from "./useBookLabel";

interface InProgressCardProps {
  item: InProgressItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  now: number;
  highlighted?: boolean;
}

export function InProgressCard({
  item,
  isFavorite,
  onToggleFavorite,
  now,
  highlighted = false,
}: InProgressCardProps) {
  const { t } = useTranslate();
  const getBookLabel = useBookLabel();
  const { series, currentBook, resumeBook, remainingBooks, progressPercent } = item;

  const resumeHref = resumeBook ? `/books/${resumeBook.id}` : `/series/${series.id}`;
  const resumeLabel = currentBook
    ? t("inProgress.card.resume")
    : resumeBook
      ? series.booksReadCount > 0
        ? t("inProgress.card.continue")
        : t("inProgress.card.start")
      : t("inProgress.card.openSeries");
  const bookLabel = resumeBook ? getBookLabel(resumeBook) : null;
  const paused = isPaused(item, now);
  const almostDone = remainingBooks <= 2;
  const page = currentBook?.readProgress?.page ?? 0;
  const totalPages = currentBook?.pageCount ?? 0;
  const pagePercent = getBookProgressPercent(currentBook);
  const displayPercent = pagePercent ?? progressPercent;
  const meta = [
    series.authors?.[0]?.name,
    series.genres?.[0],
    series.startYear ? String(series.startYear) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <article
      id={`in-progress-series-${series.id}`}
      data-series-id={series.id}
      data-testid={`in-progress-card-${series.id}`}
      aria-labelledby={`in-progress-title-${series.id}`}
      className={cn(
        "group/card relative flex h-full gap-3 rounded-2xl bg-surface-1 p-3 ring-1 ring-border/60",
        "transition-[translate,box-shadow,background-color] duration-500 ease-projection",
        "hover:-translate-y-0.5 hover:bg-surface-2 hover:ring-border motion-reduce:transition-none",
        highlighted && "bg-primary/5 ring-2 ring-primary shadow-lg shadow-primary/10"
      )}
    >
      <Link
        href={resumeHref}
        className="relative block aspect-2/3 w-[92px] shrink-0 self-start overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border/40 sm:w-[104px]"
        aria-label={t("inProgress.coverLink", { title: series.name })}
      >
        <SeriesCover
          series={series}
          alt={t("series.coverAlt", { title: series.name })}
          showProgressUi={false}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-border/40"
        />
        {almostDone && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-primary/90 px-1 py-1 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
            <Flame className="h-2.5 w-2.5" />
            {t("inProgress.card.almostDone")}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/series/${series.id}`}
              id={`in-progress-title-${series.id}`}
              className="line-clamp-2 font-display font-semibold leading-tight transition-colors hover:text-primary"
            >
              {series.name}
            </Link>
            {meta && (
              <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
            )}
          </div>
          <InProgressFavoriteButton
            seriesId={series.id}
            seriesName={series.name}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>

        <div className="mt-1 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {pagePercent !== null
                ? t("home.hero.page", { current: page, total: totalPages })
                : t("inProgress.card.read", {
                    read: series.booksReadCount,
                    total: series.bookCount,
                  })}
            </span>
            <span className="tabular-nums">{displayPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <ProgressFill percent={displayPercent} delay={0.15} />
          </div>
          {pagePercent !== null && (
            <p className="text-[10px] text-muted-foreground">
              {t("inProgress.card.read", {
                read: series.booksReadCount,
                total: series.bookCount,
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Badge
            variant={almostDone ? "default" : "secondary"}
            className="px-2 py-0 text-[10px] font-semibold"
          >
            {t("inProgress.card.remaining", { count: remainingBooks })}
          </Badge>
          {paused && (
            <Badge variant="outline" className="gap-1 px-2 py-0 text-[10px] font-medium">
              <PauseCircle className="h-2.5 w-2.5" />
              {t("inProgress.card.paused")}
            </Badge>
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <BookOpen className="h-3 w-3 shrink-0 text-primary" />
            <span className="line-clamp-1">
              {bookLabel
                ? currentBook
                  ? t("inProgress.card.current", { title: bookLabel })
                  : t("inProgress.card.next", { title: bookLabel })
                : t("inProgress.card.noBook")}
            </span>
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <RelativeTime
              value={item.lastReadAt}
              now={now}
              fallback={t("inProgress.card.neverRead")}
              className="truncate"
            />
          </span>
          <Button
            asChild
            size="sm"
            variant={almostDone ? "default" : "secondary"}
            className="h-8 shrink-0 gap-1.5 px-3 text-xs"
          >
            <Link href={resumeHref}>
              {resumeBook ? (
                <Play className="h-3 w-3" />
              ) : (
                <BookOpen className="h-3 w-3" />
              )}
              {resumeLabel}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
