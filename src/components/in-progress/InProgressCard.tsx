"use client";

import Link from "next/link";
import { Flame, PauseCircle } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
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
  const { series, resumeBook, remainingBooks } = item;

  const resumeHref = resumeBook ? `/books/${resumeBook.id}` : `/series/${series.id}`;
  const paused = isPaused(item);
  const almostDone = remainingBooks <= 2;

  return (
    <article
      id={`in-progress-series-${series.id}`}
      data-series-id={series.id}
      data-testid={`in-progress-card-${series.id}`}
      aria-label={series.name}
      className="group/card h-full"
    >
      <div className="relative">
        <Link
          href={resumeHref}
          className={cn(
            "relative block aspect-2/3 overflow-hidden rounded-xl bg-surface-2",
            "transition-[box-shadow,translate] duration-500 ease-projection motion-reduce:transition-none",
            "group-hover/card:-translate-y-0.5",
            highlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          aria-label={t("inProgress.coverLink", { title: series.name })}
        >
          <span className="absolute inset-0 block overflow-hidden rounded-xl">
            <span className="block h-full w-full transition-transform duration-700 ease-projection group-hover/card:scale-[1.04] motion-reduce:transition-none">
              <SeriesCover
                series={series}
                alt={t("series.coverAlt", { title: series.name })}
              />
            </span>
          </span>

          {paused ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
              <PauseCircle className="h-3 w-3" />
              {t("inProgress.card.paused")}
            </span>
          ) : almostDone ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              <Flame className="h-3 w-3" />
              {t("inProgress.card.almostDone")}
            </span>
          ) : null}
        </Link>

        <div
          className={cn(
            "absolute right-2 top-2 z-10 flex gap-1",
            "pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:duration-200",
            "pointer-fine:group-hover/card:opacity-100 pointer-fine:group-focus-within/card:opacity-100"
          )}
        >
          {canShelve && onToggleShelf && (
            <InProgressShelfButton
              seriesId={series.id}
              seriesName={series.name}
              isShelved={isShelved}
              isShelving={isShelving}
              onToggle={onToggleShelf}
              tone="overlay"
            />
          )}
          <InProgressFavoriteButton
            seriesId={series.id}
            seriesName={series.name}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
            tone="overlay"
          />
        </div>
      </div>
    </article>
  );
}
