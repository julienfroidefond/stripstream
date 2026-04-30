"use client";

import { useEffect, useState, useCallback } from "react";
import type { BookReaderProps } from "../types";
import { useReadingDirection } from "./useReadingDirection";
import { useFullscreen } from "./useFullscreen";
import { useDoublePageMode } from "./useDoublePageMode";
import { useFitMode } from "./useFitMode";
import { useImageLoader } from "./useImageLoader";
import { usePageNavigation } from "./usePageNavigation";
import { useTouchNavigation } from "./useTouchNavigation";
import { usePreferences } from "@/contexts/PreferencesContext";
import logger from "@/lib/logger";

export function useReaderState({ book, pages, onClose, nextBook }: BookReaderProps) {
  const { preferences } = usePreferences();
  const [showControls, setShowControls] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const totalPages = pages.length;

  const bookPageUrlBuilder = useCallback(
    (pageNum: number) => book.thumbnailUrl.replace("/thumbnail", `/pages/${pageNum}`),
    [book.thumbnailUrl]
  );
  const nextBookPageUrlBuilder = useCallback(
    (pageNum: number) =>
      nextBook ? nextBook.thumbnailUrl.replace("/thumbnail", `/pages/${pageNum}`) : "",
    [nextBook]
  );

  const { direction, toggleDirection, isRTL } = useReadingDirection();
  const { isFullscreen, isFullscreenAvailable, toggleFullscreen } = useFullscreen();
  const {
    isDoublePage,
    shouldShowDoublePage: shouldShowDoublePageRaw,
    toggleDoublePage,
  } = useDoublePageMode();
  const { fitMode, cycleFitMode } = useFitMode();

  // Wrapper mémoïsé : signature à 1 argument pour les consommateurs,
  // tout en bornant la longueur du livre une seule fois par render.
  const shouldShowDoublePage = useCallback(
    (page: number) => shouldShowDoublePageRaw(page, totalPages),
    [shouldShowDoublePageRaw, totalPages]
  );

  const {
    imageBlobUrls,
    imageErrors,
    prefetchImage,
    retryImage,
    prefetchPages,
    prefetchNextBook,
    cancelAllPrefetches,
    evictOutsideWindow,
    prefetchCount,
  } = useImageLoader({
    pageUrlBuilder: bookPageUrlBuilder,
    pages,
    prefetchCount: preferences.readerPrefetchCount,
    nextBook: nextBook ? { getPageUrl: nextBookPageUrlBuilder, pages: [] } : null,
  });

  const { currentPage, showEndMessage, navigateToPage, handlePreviousPage, handleNextPage } =
    usePageNavigation({
      book,
      pages,
      isDoublePage,
      shouldShowDoublePage,
      onClose,
      nextBook,
    });

  useTouchNavigation({
    onPreviousPage: handlePreviousPage,
    onNextPage: handleNextPage,
    isRTL,
  });

  // Activer le pinch-zoom dans le reader + reset au changement d'orientation iOS
  useEffect(() => {
    document.body.classList.remove("no-pinch-zoom");

    const handleOrientationChange = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        const original = viewport.getAttribute("content") || "";
        viewport.setAttribute("content", original + ", maximum-scale=1");
        requestAnimationFrame(() => {
          viewport.setAttribute("content", original);
        });
      }
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.body.classList.add("no-pinch-zoom");
    };
  }, []);

  // Prefetch + éviction de la fenêtre cache à chaque changement de page
  useEffect(() => {
    const visiblePages: number[] = [];
    if (isDoublePage && shouldShowDoublePage(currentPage)) {
      visiblePages.push(currentPage, currentPage + 1);
    } else {
      visiblePages.push(currentPage);
    }

    Promise.all(visiblePages.map((page) => prefetchImage(page))).catch((err) => {
      logger.warn({ err, currentPage }, "Reader prefetch of visible pages failed");
    });

    const concurrency = isDoublePage && shouldShowDoublePage(currentPage) ? 2 : 4;
    prefetchPages(currentPage, prefetchCount, visiblePages, concurrency);

    if (
      isDoublePage &&
      shouldShowDoublePage(currentPage) &&
      currentPage + prefetchCount < totalPages
    ) {
      prefetchPages(currentPage + prefetchCount, 1, visiblePages, concurrency);
    }

    const pagesFromEnd = totalPages - currentPage;
    if (pagesFromEnd <= prefetchCount && nextBook) {
      prefetchNextBook(prefetchCount);
    }

    evictOutsideWindow(currentPage);
  }, [
    currentPage,
    isDoublePage,
    shouldShowDoublePage,
    prefetchImage,
    prefetchPages,
    prefetchNextBook,
    evictOutsideWindow,
    prefetchCount,
    totalPages,
    nextBook,
  ]);

  const handleCloseReader = useCallback(
    (page: number) => {
      cancelAllPrefetches();
      onClose?.(page);
    },
    [cancelAllPrefetches, onClose]
  );

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRTL) handleNextPage();
        else handlePreviousPage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRTL) handlePreviousPage();
        else handleNextPage();
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        handleCloseReader(currentPage);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextPage, handlePreviousPage, onClose, isRTL, currentPage, handleCloseReader]);

  const onToggleControls = useCallback(() => setShowControls((prev) => !prev), []);
  const onToggleThumbnails = useCallback(() => setShowThumbnails((prev) => !prev), []);
  const onToggleFullscreen = useCallback(
    () => toggleFullscreen(document.body),
    [toggleFullscreen]
  );

  return {
    book,
    pages,
    totalPages,
    currentPage,
    showEndMessage,
    showControls,
    showThumbnails,
    isDoublePage,
    isFullscreen,
    isFullscreenAvailable,
    isRTL,
    direction,
    fitMode,
    imageBlobUrls,
    imageErrors,
    shouldShowDoublePage,
    onPreviousPage: handlePreviousPage,
    onNextPage: handleNextPage,
    onPageChange: navigateToPage,
    onClose: handleCloseReader,
    onToggleControls,
    onToggleThumbnails,
    onToggleDoublePage: toggleDoublePage,
    onToggleFullscreen,
    onToggleDirection: toggleDirection,
    onCycleFitMode: cycleFitMode,
    onRetryImage: retryImage,
  };
}
