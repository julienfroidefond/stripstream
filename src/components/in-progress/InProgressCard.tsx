"use client";

import { IntentLink } from "@/components/common/IntentLink";
import { Flame, PauseCircle, Play } from "lucide-react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { getSeriesReadingState } from "@/lib/series/reading-status";
import { isPaused, type InProgressItem } from "@/lib/services/in-progress.service";
import { InProgressFavoriteButton } from "./InProgressFavoriteButton";
import { InProgressShelfButton } from "./InProgressShelfButton";

interface InProgressCardProps {
  item: InProgressItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  highlighted?: boolean;
  canShelve?: boolean;
  isShelved?: boolean;
  isShelving?: boolean;
  onToggleShelf?: () => void;
}

export function InProgressCard({
  item,
  isFavorite,
  onToggleFavorite,
  highlighted = false,
  canShelve = false,
  isShelved = false,
  isShelving = false,
  onToggleShelf,
}: InProgressCardProps) {
  const { t } = useTranslate();
  const { series, currentBook, resumeBook, remainingBooks } = item;

  const resumeHref = resumeBook ? `/books/${resumeBook.id}` : null;
  const resumeLabel = resumeBook
    ? currentBook
      ? t("inProgress.card.resume")
      : series.booksReadCount > 0
        ? t("inProgress.card.continue")
        : t("inProgress.card.start")
    : null;
  const paused = isPaused(item);
  const almostDone = remainingBooks <= 2;
  const readingState = getSeriesReadingState(series);
  const progressLabel =
    readingState.total > 0
      ? t(
          readingState.total === 1
            ? "inProgress.card.progress"
            : "inProgress.card.progress_plural",
          { read: readingState.read, count: readingState.total }
        )
      : t("series.status.noBooks");

  return (
    <article
      id={`in-progress-series-${series.id}`}
      data-series-id={series.id}
      data-testid={`in-progress-card-${series.id}`}
      aria-label={series.name}
      className="flex h-full flex-col gap-2"
    >
      <BookCoverScene
        href={`/series/${series.id}`}
        ariaLabel={t("inProgress.coverLink", { title: series.name })}
        highlighted={highlighted}
        cover={
          <SeriesCover
            series={series}
            alt={t("series.coverAlt", { title: series.name })}
          />
        }
        badge={
          paused ? (
            <span className="absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
              <PauseCircle className="h-3 w-3" />
              {t("inProgress.card.paused")}
            </span>
          ) : almostDone ? (
            <span className="absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              <Flame className="h-3 w-3" />
              {t("inProgress.card.almostDone")}
            </span>
          ) : null
        }
        overlay={
          resumeHref &&
          resumeLabel && (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center">
              <IntentLink
                href={resumeHref}
                data-testid={`in-progress-resume-${series.id}`}
                aria-label={`${resumeLabel} — ${series.name}`}
                className={cn(
                  "pointer-events-auto inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3",
                  "bg-black/70 text-xs font-semibold text-white shadow-lg",
                  "transition-[opacity,translate,background-color] duration-200 ease-out",
                  "hover:bg-black/85 motion-reduce:transition-none",
                  // Au pointeur fin, l'action se révèle au survol. Sur mobile
                  // (pointeur grossier), elle reste visible et tappable.
                  "pointer-fine:pointer-events-none pointer-fine:translate-y-1 pointer-fine:opacity-0",
                  "pointer-fine:group-hover/card:pointer-events-auto pointer-fine:group-hover/card:translate-y-0 pointer-fine:group-hover/card:opacity-100",
                  "pointer-fine:group-focus-within/card:pointer-events-auto pointer-fine:group-focus-within/card:translate-y-0 pointer-fine:group-focus-within/card:opacity-100"
                )}
              >
                <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
                <span className="truncate">{resumeLabel}</span>
              </IntentLink>
            </div>
          )
        }
      />

      <div className="space-y-0.5 px-0.5">
        <IntentLink
          href={`/series/${series.id}`}
          className="line-clamp-1 font-medium leading-tight transition-colors hover:text-primary"
        >
          {series.name}
        </IntentLink>
        <div className="flex items-center justify-between gap-2">
          <p
            className="min-w-0 truncate text-xs text-muted-foreground"
            title={progressLabel}
          >
            {progressLabel}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {canShelve && onToggleShelf && (
              <InProgressShelfButton
                seriesId={series.id}
                seriesName={series.name}
                isShelved={isShelved}
                isShelving={isShelving}
                onToggle={onToggleShelf}
              />
            )}
            <InProgressFavoriteButton
              seriesId={series.id}
              seriesName={series.name}
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
