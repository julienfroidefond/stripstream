"use client";
import React from "react";

import { Book, BookCheck, BookOpen, BookMarked, BookX, Star, StarOff, User, CircleDot, CircleCheck, CirclePause, CircleX, Calendar, Loader2 } from "lucide-react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { RefreshButton } from "@/components/library/RefreshButton";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { useTranslate } from "@/hooks/useTranslate";
import { SeriesCover } from "@/components/ui/series-cover";
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
import logger from "@/lib/logger";
import { addToFavorites, removeFromFavorites } from "@/app/actions/favorites";
import { updateSeriesReadStatus } from "@/app/actions/read-progress";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { SeriesRatingControl } from "./SeriesRatingControl";
import type { NormalizedProviderRating } from "@/lib/providers/types";
import { motion, useReducedMotion } from "framer-motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { fadeUp, liftIn, screenUnroll, staggerContainer } from "@/lib/motion";
import { SplitWords, useSceneExit } from "@/components/motion";

interface SeriesHeaderProps {
  series: NormalizedSeries;
  refreshSeries: (seriesId: string) => Promise<{ success: boolean; error?: string }>;
  initialIsFavorite: boolean;
  canRate?: boolean;
  initialRating?: number | null;
  providerRatings?: NormalizedProviderRating[];
}

export const SeriesHeader = ({
  series,
  refreshSeries,
  initialIsFavorite,
  canRate = false,
  initialRating = null,
  providerRatings = [],
}: SeriesHeaderProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { isAnonymous } = useAnonymous();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [bulkAction, setBulkAction] = useState<null | "read" | "unread">(null);
  const [isConfirmUnreadOpen, setIsConfirmUnreadOpen] = useState(false);
  const { t } = useTranslate();
  const reduce = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);
  const scene = useSceneExit(headerRef);
  const staged = reduce
    ? {}
    : { variants: staggerContainer(0.08, 0.05), initial: "hidden" as const, animate: "visible" as const };

  const handleToggleFavorite = async () => {
    try {
      const action = isFavorite ? removeFromFavorites : addToFavorites;
      const result = await action(series.id);

      if (result.success) {
        setIsFavorite(!isFavorite);
        // Dispatcher l'événement avec le seriesId pour mise à jour optimiste de la sidebar
        const event = new CustomEvent("favoritesChanged", {
          detail: {
            seriesId: series.id,
            action: isFavorite ? "remove" : "add",
            series: isFavorite ? undefined : series,
          },
        });
        window.dispatchEvent(event);
        // Force le client à re-fetch le layout (avec cache invalidé par revalidateTag).
        // Sans ça, initialFavorites côté Sidebar reste stale et écrase l'optimistic update.
        router.refresh();
        toast({
          title: t(isFavorite ? "series.header.favorite.remove" : "series.header.favorite.add"),
          description: series.name,
        });
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

  const handleBulkReadStatus = async (read: boolean) => {
    setBulkAction(read ? "read" : "unread");
    const prefix = read ? "series.header.markAllRead" : "series.header.markAllUnread";
    try {
      const result = await updateSeriesReadStatus(series.id, read);
      // Les caches serveur sont invalidés même en cas d'échec partiel : on
      // rafraîchit dans tous les cas pour refléter ce qui a été enregistré.
      router.refresh();
      if (!result.success) {
        throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
      }
      toast({
        title: t(`${prefix}.success.title`),
        description: t(`${prefix}.success.description`, {
          count: result.updated ?? series.bookCount,
        }),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du marquage groupé de la série:");
      toast({
        variant: "destructive",
        title: t(`${prefix}.error.title`),
        description: t(`${prefix}.error.description`),
      });
    } finally {
      setBulkAction(null);
    }
  };

  const getReadingStatusInfo = () => {
    const { bookCount, booksReadCount } = series;
    const booksUnreadCount = bookCount - booksReadCount;
    const booksInProgressCount = bookCount - (booksReadCount + booksUnreadCount);

    if (booksReadCount === bookCount) {
      return {
        label: t("series.header.status.read"),
        status: "success" as const,
        icon: BookMarked,
      };
    }

    if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < bookCount)) {
      return {
        label: t("series.header.status.progress", {
          read: booksReadCount,
          total: bookCount,
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
      <motion.div
        className="absolute inset-0"
        style={{ y: scene.backdropY, scale: scene.backdropScale }}
      >
        <motion.div
          className="absolute inset-0"
          variants={reduce ? undefined : screenUnroll}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "visible"}
        >
          <ProjectionBackdrop src={series.thumbnailUrl} />
        </motion.div>
      </motion.div>
      {/* Contenu */}
      <div className="relative container mx-auto flex min-h-[260px] items-end px-4 pb-8 pt-12 md:min-h-[340px] md:pb-10 md:pt-16">
        <motion.div
          className="flex w-full flex-col items-center gap-6 md:flex-row md:items-end md:gap-8"
          style={{ y: scene.contentY, opacity: scene.contentOpacity, filter: scene.contentBlur }}
          {...staged}
        >
          {/* Image principale */}
          <motion.div
            variants={reduce ? undefined : liftIn}
            className="relative aspect-2/3 w-[132px] shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border md:w-[168px]"
          >
            <SeriesCover
              series={series}
              alt={t("series.header.coverAlt", { title: series.name })}
              showProgressUi={false}
            />
          </motion.div>

          {/* Informations */}
          <motion.div
            variants={reduce ? undefined : fadeUp}
            className="min-w-0 flex-1 space-y-3 text-center text-foreground md:pb-1 md:text-left"
          >
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              <SplitWords text={series.name} />
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
                tooltip={t(
                  isFavorite ? "series.header.favorite.remove" : "series.header.favorite.add"
                )}
                iconClassName={isFavorite ? "fill-yellow-400 text-yellow-400" : ""}
              />
              {!isAnonymous && series.bookCount > 0 && (
                <>
                  <IconButton
                    data-testid="series-mark-all-read"
                    variant="ghost"
                    size="icon"
                    icon={bulkAction === "read" ? Loader2 : BookCheck}
                    onClick={() => handleBulkReadStatus(true)}
                    disabled={bulkAction !== null || series.booksReadCount >= series.bookCount}
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
              <RefreshButton
                libraryId={series.id}
                refreshLibrary={refreshSeries}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

    </div>
  );
};
