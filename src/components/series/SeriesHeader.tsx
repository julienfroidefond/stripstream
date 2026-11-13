"use client";
import React from "react";

import { Book, BookCheck, BookOpen, BookMarked, BookX, ArchiveRestore, Snowflake, Star, StarOff, User, CircleDot, CircleCheck, CirclePause, CircleX, Calendar, Loader2 } from "lucide-react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { useRef, useState } from "react";
import { RefreshButton } from "@/components/common/RefreshButton";
import { useTranslate } from "@/hooks/useTranslate";
import { SeriesCover } from "@/components/ui/series-cover";
import { getSeriesReadingStatusLabel } from "@/components/ui/series-reading-status";
import { getSeriesReadingState } from "@/lib/series-reading-status";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { CoverEdge } from "@/components/ui/cover-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconButton } from "@/components/ui/icon-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useReadProgressMutations } from "@/contexts/ReadProgressMutationsContext";
import { useSeriesMutations } from "@/contexts/SeriesMutationsContext";
import { SeriesRatingControl } from "./SeriesRatingControl";
import type { NormalizedProviderRating } from "@/lib/providers/types";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { useBannerScene } from "@/components/motion";
import { burst, nudge, pop } from "@/lib/celebrate";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface SeriesHeaderProps {
  series: NormalizedSeries;
  initialIsFavorite: boolean;
  canRate?: boolean;
  initialRating?: number | null;
  providerRatings?: NormalizedProviderRating[];
  /** La mise de côté n'est disponible qu'avec Stripstream Librarian. */
  canShelve?: boolean;
  initialIsShelved?: boolean;
}

export const SeriesHeader = ({
  series: serverSeries,
  initialIsFavorite,
  canRate = false,
  initialRating = null,
  providerRatings = [],
  canShelve = false,
  initialIsShelved = false,
}: SeriesHeaderProps) => {
  const { isAnonymous } = useAnonymous();
  const readProgress = useReadProgressMutations();
  // Comptes de lecture optimistes pendant un marquage groupé, rollback compris.
  const series = readProgress.resolveSeries(serverSeries);
  const pendingRead = readProgress.pendingSeries(serverSeries.id);
  const bulkAction = pendingRead === null ? null : pendingRead ? "read" : "unread";
  const mutations = useSeriesMutations();
  const isFavorite = mutations.isFavorite(series.id, initialIsFavorite);
  const isShelved = mutations.isShelved(series.id, initialIsShelved);
  const isFavoritePending = mutations.isFavoritePending(series.id);
  const isShelfPending = mutations.isShelfPending(series.id);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isConfirmUnreadOpen, setIsConfirmUnreadOpen] = useState(false);
  const { t } = useTranslate();
  const reduce = usePrefersReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);
  useBannerScene(headerRef);
  /** Marqueurs d'entrée en scène de `useBannerScene` (états de départ en CSS). */
  const fly = reduce ? {} : { "data-hero-fly": "" };
  const item = reduce ? {} : { "data-hero-item": "" };

  const handleToggleFavorite = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Capturé tout de suite : `currentTarget` n'existe plus après l'`await`.
    const button = event.currentTarget;
    const added = await mutations.toggleFavorite(serverSeries, isFavorite);
    if (added === null) return;

    // L'icône change de composant au rendu suivant : on l'anime après.
    requestAnimationFrame(() => {
      const icon = button.querySelector("svg");
      if (added) {
        pop(icon, 1.5);
        burst(button, { color: "rgb(250 204 21)", count: 12 });
      } else {
        nudge(icon);
      }
    });
  };

  const handleToggleShelf = async () => {
    await mutations.setShelf(serverSeries, !isShelved);
  };

  const handleBulkReadStatus = (read: boolean) => {
    void readProgress.markSeries(serverSeries, read);
  };

  const getReadingStatusInfo = () => {
    const readingState = getSeriesReadingState(series);
    const label = getSeriesReadingStatusLabel(t, readingState);

    switch (readingState.status) {
      case "no-books":
        return {
          label,
          status: "warning" as const,
          icon: BookX,
        };
      case "read":
        return {
          label,
          status: "success" as const,
          icon: BookMarked,
        };
      case "in-progress":
        return {
          label,
          status: "reading" as const,
          icon: BookOpen,
        };
      case "unread":
        return {
          label,
          status: "unread" as const,
          icon: Book,
        };
    }
  };

  const getSeriesStatusInfo = () => {
    const status = series.seriesStatus;
    if (!status) return null;
    const map: Record<string, { status: "info" | "success" | "warning" | "error"; icon: typeof CircleDot }> = {
      ongoing: { status: "info", icon: CircleDot },
      ended: { status: "success", icon: CircleCheck },
      hiatus: { status: "warning", icon: CirclePause },
      cancelled: { status: "error", icon: CircleX },
    };
    const entry = map[status];
    if (!entry) return null;
    return { ...entry, label: t(`series.header.seriesStatus.${status}`) };
  };

  const statusInfo = isAnonymous ? null : getReadingStatusInfo();
  const seriesStatusInfo = getSeriesStatusInfo();
  const authorsText = series.authors?.length
    ? series.authors.map((a) => a.name).join(", ")
    : null;

  return (
    <div ref={headerRef} className="relative w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      {/* Image de fond : l'écran se déroule, puis glisse moins vite que la page. */}
      <div className="absolute inset-0" data-banner-backdrop>
        <div className="absolute inset-0" {...(reduce ? {} : { "data-banner-unroll": "" })}>
          <ProjectionBackdrop src={series.thumbnailUrl} />
        </div>
      </div>
      {/* Contenu */}
      <div className="relative container mx-auto flex min-h-[260px] items-end px-4 pb-8 pt-12 md:min-h-[340px] md:pb-10 md:pt-16">
        <div
          className="flex w-full flex-col items-center gap-6 md:flex-row md:items-end md:gap-8"
          data-banner-content
        >
          {/* Image principale */}
          <div
            {...fly}
            className="relative aspect-2/3 w-[132px] shrink-0 md:w-[168px]"
          >
            <BookCoverScene
              contained
              className="w-full"
              cover={
                <>
                  <SeriesCover
                    series={series}
                    alt={t("series.header.coverAlt", { title: series.name })}
                    showProgressUi={false}
                  />
                  <CoverEdge />
                </>
              }
            />
          </div>

          {/* Informations */}
          <div
            {...item}
            className="min-w-0 flex-1 space-y-3 text-center text-foreground md:pb-1 md:text-left"
          >
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              <span data-banner-title>{series.name}</span>
            </h1>
            {(authorsText || series.startYear != null) && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:justify-start">
                {authorsText && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {authorsText}
                  </span>
                )}
                {series.startYear != null && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {series.startYear}
                  </span>
                )}
              </div>
            )}
            {series.genres && series.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {series.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            {series.summary && (
              <div className="mx-auto max-w-3xl md:mx-0">
                <p className={cn("text-sm text-muted-foreground md:text-base", isDescriptionExpanded ? "max-h-[200px] overflow-y-auto" : "line-clamp-3")}>
                  {series.summary}
                </p>
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(isDescriptionExpanded ? "series.header.showLess" : "series.header.showMore")}
                </button>
              </div>
            )}
            <div className="flex items-center gap-x-3 gap-y-2 pt-1 justify-center md:justify-start flex-wrap">
              {seriesStatusInfo && (
                <StatusBadge status={seriesStatusInfo.status} icon={seriesStatusInfo.icon}>
                  {seriesStatusInfo.label}
                </StatusBadge>
              )}
              {statusInfo && (
                <StatusBadge status={statusInfo.status} icon={statusInfo.icon}>
                  {statusInfo.label}
                </StatusBadge>
              )}
              {canShelve && !isAnonymous && isShelved && (
                <StatusBadge
                  status="info"
                  icon={Snowflake}
                  className="border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                >
                  {t("series.header.shelf.badge")}
                </StatusBadge>
              )}
              <span className="text-sm text-muted-foreground tabular-nums">
                {series.bookCount === 1
                  ? t("series.header.books", { count: series.bookCount })
                  : t("series.header.books_plural", { count: series.bookCount })}
              </span>
              {series.missingCount != null && series.missingCount > 0 && (
                <StatusBadge status="warning" icon={BookX}>
                  {t("series.header.missing", { count: series.missingCount })}
                </StatusBadge>
              )}
              {canRate && !isAnonymous && (
                <SeriesRatingControl
                  seriesId={series.id}
                  initialRating={initialRating}
                  providerRatings={providerRatings}
                />
              )}
              <IconButton
                data-testid={isFavorite ? "series-favorite-remove" : "series-favorite-add"}
                variant="ghost"
                size="icon"
                icon={isFavorite ? Star : StarOff}
                onClick={handleToggleFavorite}
                disabled={isFavoritePending}
                tooltip={t(
                  isFavorite ? "series.header.favorite.remove" : "series.header.favorite.add"
                )}
                iconClassName={isFavorite ? "fill-yellow-400 text-yellow-400" : ""}
              />
              {canShelve && !isAnonymous && (
                <IconButton
                  data-testid={isShelved ? "series-shelf-unshelve" : "series-shelf-shelve"}
                  variant="ghost"
                  size="icon"
                  icon={isShelfPending ? Loader2 : isShelved ? ArchiveRestore : Snowflake}
                  onClick={handleToggleShelf}
                  disabled={isShelfPending}
                  tooltip={t(
                    isShelved ? "series.header.shelf.resume" : "series.header.shelf.shelve"
                  )}
                  iconClassName={cn(
                    isShelfPending && "animate-spin",
                    isShelved && !isShelfPending && "text-cyan-500"
                  )}
                />
              )}
              {!isAnonymous && series.bookCount > 0 && (
                <>
                  <IconButton
                    data-testid="series-mark-all-read"
                    variant="ghost"
                    size="icon"
                    icon={bulkAction === "read" ? Loader2 : BookCheck}
                    onClick={() => handleBulkReadStatus(true)}
                    disabled={
                      bulkAction !== null ||
                      getSeriesReadingState(series).status === "read"
                    }
                    tooltip={t("series.header.markAllRead.tooltip")}
                    iconClassName={bulkAction === "read" ? "animate-spin" : ""}
                  />
                  <AlertDialog open={isConfirmUnreadOpen} onOpenChange={setIsConfirmUnreadOpen}>
                    <IconButton
                      data-testid="series-mark-all-unread"
                      variant="ghost"
                      size="icon"
                      icon={bulkAction === "unread" ? Loader2 : BookX}
                      onClick={() => setIsConfirmUnreadOpen(true)}
                      disabled={bulkAction !== null}
                      tooltip={t("series.header.markAllUnread.tooltip")}
                      iconClassName={bulkAction === "unread" ? "animate-spin" : ""}
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("series.header.markAllUnread.confirm.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("series.header.markAllUnread.confirm.description", {
                            count: series.bookCount,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("series.header.markAllUnread.confirm.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          data-testid="series-mark-all-unread-confirm"
                          onClick={() => handleBulkReadStatus(false)}
                        >
                          {t("series.header.markAllUnread.confirm.confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <RefreshButton />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
