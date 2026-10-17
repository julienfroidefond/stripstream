/* eslint-disable no-console */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { BookReaderProps } from "../types";
import { useReadingDirection } from "./useReadingDirection";
import { useFullscreen } from "./useFullscreen";
import { useDoublePageMode } from "./useDoublePageMode";
import { useImageLoader } from "./useImageLoader";
import { usePageNavigation } from "./usePageNavigation";
import { useTouchNavigation } from "./useTouchNavigation";
import { resolveReaderShortcut } from "./keyboardShortcuts";
import { usePreferences } from "@/contexts/PreferencesContext";
import { updatePreferences } from "@/app/actions/preferences";
import type { ReaderBackground } from "@/types/preferences";

export function useReaderState({ book, pages, onClose, nextBook }: BookReaderProps) {
  const { preferences } = usePreferences();
  const [showControls, setShowControls] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [readerBackground, setReaderBackground] = useState<ReaderBackground>(preferences.readerBackground);

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

  const { direction, toggleDirection, isRTL } = useReadingDirection(preferences.readingDirection);
  const { isFullscreen, isFullscreenAvailable, toggleFullscreen } = useFullscreen();
  const {
    isDoublePage,
    shouldShowDoublePage: shouldShowDoublePageRaw,
    toggleDoublePage,
  } = useDoublePageMode(preferences.readerDoublePageMode);
  // Les anciens modes largeur/hauteur/original sont retirés. On ignore aussi
  // toute préférence historique persistée afin que chaque lecteur utilise le
  // même cadrage, compatible avec le spread double page.
  const fitMode = "fit" as const;

  // Wrapper mémoïsé : signature à 1 argument pour les consommateurs,
  // tout en bornant la longueur du livre une seule fois par render.
  const shouldShowDoublePage = useCallback(
    (page: number) => shouldShowDoublePageRaw(page, totalPages),
    [shouldShowDoublePageRaw, totalPages]
  );

  const nextBookForLoader = useMemo(
    () => nextBook ? { getPageUrl: nextBookPageUrlBuilder, pages: [] as number[] } : null,
    [nextBook, nextBookPageUrlBuilder]
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
    nextBook: nextBookForLoader,
  });

  const { currentPage, showEndMessage, startBump, navigateToPage, handlePreviousPage, handleNextPage } =
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

    console.debug(`[reader/state] page=${currentPage} visible=[${visiblePages.join(",")}] doublePage=${isDoublePage}`);
    Promise.all(visiblePages.map((page) => prefetchImage(page))).catch((err) => {
      console.warn(`[reader/state] prefetch failed page=${currentPage}`, err);
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
      console.debug(`[reader/state] close bookId=${book.id} page=${page}`);
      cancelAllPrefetches();
      onClose?.(page);
    },
    [book.id, cancelAllPrefetches, onClose]
  );

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Radix gère ses propres dialogues : tant qu'ils sont ouverts, `Échap`
      // doit fermer le dialogue (pas le livre) et les lettres rester inactives.
      if (showInfo || showShortcuts || showEndMessage) return;

      const action = resolveReaderShortcut(e, { isRTL, isFullscreenAvailable });
      if (!action) return;

      e.preventDefault();

      switch (action) {
        case "previous-page":
          handlePreviousPage();
          break;
        case "next-page":
          handleNextPage();
          break;
        case "first-page":
          navigateToPage(1);
          break;
        case "last-page":
          navigateToPage(totalPages);
          break;
        case "toggle-fullscreen":
          toggleFullscreen(document.body);
          break;
        case "toggle-double-page":
          toggleDoublePage();
          break;
        case "toggle-thumbnails":
          setShowThumbnails((prev) => !prev);
          break;
        case "toggle-info":
          setShowInfo((prev) => !prev);
          break;
        case "toggle-direction":
          toggleDirection();
          break;
        case "toggle-shortcuts":
          setShowShortcuts(true);
          break;
        case "close-reader":
          if (onClose) handleCloseReader(currentPage);
          break;
      }
    };
    // Capture sur `window` : Radix ferme le dialogue ouvert sur le même
    // `keydown` et React commite cet état de façon synchrone. En phase de
    // bouillonnement, notre garde lirait déjà `showInfo`/`showShortcuts` à
    // `false` et fermerait le livre au lieu du dialogue.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    handleNextPage,
    handlePreviousPage,
    navigateToPage,
    totalPages,
    isRTL,
    isFullscreenAvailable,
    toggleFullscreen,
    toggleDoublePage,
    toggleDirection,
    onClose,
    currentPage,
    handleCloseReader,
    showInfo,
    showShortcuts,
    showEndMessage,
  ]);

  const onToggleControls = useCallback(() => setShowControls((prev) => !prev), []);
  const onToggleThumbnails = useCallback(() => setShowThumbnails((prev) => !prev), []);
  const onToggleInfo = useCallback(() => setShowInfo((prev) => !prev), []);
  const onToggleShortcuts = useCallback(() => setShowShortcuts((prev) => !prev), []);
  const onReaderBackgroundChange = useCallback((background: ReaderBackground) => {
    setReaderBackground(background);
    updatePreferences({ readerBackground: background }).catch(() => undefined);
  }, []);
  const onInfoOpenChange = useCallback((open: boolean) => setShowInfo(open), []);
  const onShortcutsOpenChange = useCallback((open: boolean) => setShowShortcuts(open), []);
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
    showInfo,
    showShortcuts,
    readerBackground,
    isDoublePage,
    isFullscreen,
    isFullscreenAvailable,
    isRTL,
    direction,
    fitMode,
    pageTurn: preferences.readerPageTurn,
    startBump,
    imageBlobUrls,
    imageErrors,
    shouldShowDoublePage,
    onPreviousPage: handlePreviousPage,
    onNextPage: handleNextPage,
    onPageChange: navigateToPage,
    onClose: handleCloseReader,
    onToggleControls,
    onToggleThumbnails,
    onToggleInfo,
    onToggleShortcuts,
    onReaderBackgroundChange,
    onInfoOpenChange,
    onShortcutsOpenChange,
    onToggleDoublePage: toggleDoublePage,
    onToggleFullscreen,
    onToggleDirection: toggleDirection,
    onRetryImage: retryImage,
  };
}
