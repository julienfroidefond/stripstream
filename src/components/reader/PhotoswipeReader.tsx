/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import "photoswipe/style.css";
import type { BookReaderProps } from "./types";
import { useFullscreen } from "./hooks/useFullscreen";
import { useReadingDirection } from "./hooks/useReadingDirection";
import { useDoublePageMode } from "./hooks/useDoublePageMode";
import { useImageLoader } from "./hooks/useImageLoader";
import { usePageNavigation } from "./hooks/usePageNavigation";
import { useTouchNavigation } from "./hooks/useTouchNavigation";
import { usePhotoSwipeZoom } from "./hooks/usePhotoSwipeZoom";
import { ControlButtons } from "./components/ControlButtons";
import { NavigationBar } from "./components/NavigationBar";
import { EndOfSeriesModal } from "./components/EndOfSeriesModal";
import { PageDisplay } from "./components/PageDisplay";
import { ReaderContainer } from "./components/ReaderContainer";
import { usePreferences } from "@/contexts/PreferencesContext";

export function PhotoswipeReader({ book, pages, onClose, nextBook }: BookReaderProps) {
  const { preferences } = usePreferences();
  const [showControls, setShowControls] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { direction, toggleDirection, isRTL } = useReadingDirection();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { isDoublePage, shouldShowDoublePage, toggleDoublePage } = useDoublePageMode();
  const { loadedImages, imageBlobUrls, prefetchPages, prefetchNextBook, handleForceReload, getPageUrl, prefetchCount } = useImageLoader({ 
    bookId: book.id, 
    pages, 
    prefetchCount: preferences.readerPrefetchCount,
    nextBook: nextBook ? { id: nextBook.id, pages: [] } : null
  });
  const { currentPage, showEndMessage, navigateToPage, handlePreviousPage, handleNextPage } = usePageNavigation({
    book,
    pages,
    isDoublePage,
    shouldShowDoublePage: (page) => shouldShowDoublePage(page, pages.length),
    onClose,
    nextBook,
  });
  const { pswpRef, handleZoom } = usePhotoSwipeZoom({
    loadedImages,
    currentPage,
    getPageUrl,
  });

  // Touch navigation
  useTouchNavigation({
    onPreviousPage: handlePreviousPage,
    onNextPage: handleNextPage,
    pswpRef,
  });

  // Activer le zoom dans le reader en enlevant la classe no-pinch-zoom
  useEffect(() => {
    document.body.classList.remove('no-pinch-zoom');

    return () => {
      document.body.classList.add('no-pinch-zoom');
    };
  }, []);


  // Prefetch current and next pages
  useEffect(() => {
    // Prefetch pages starting from current page
    prefetchPages(currentPage, prefetchCount);
    
    // If double page mode, also prefetch additional pages for smooth double page navigation
    if (isDoublePage && shouldShowDoublePage(currentPage, pages.length) && currentPage + prefetchCount < pages.length) {
      prefetchPages(currentPage + prefetchCount, 1);
    }
    
    // If we're near the end of the book, prefetch the next book
    const pagesFromEnd = pages.length - currentPage;
    if (pagesFromEnd <= prefetchCount && nextBook) {
      prefetchNextBook(prefetchCount);
    }
  }, [currentPage, isDoublePage, shouldShowDoublePage, prefetchPages, prefetchNextBook, prefetchCount, pages.length, nextBook]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRTL) {
          handleNextPage();
        } else {
          handlePreviousPage();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRTL) {
          handlePreviousPage();
        } else {
          handleNextPage();
        }
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose(currentPage);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNextPage, handlePreviousPage, onClose, isRTL, currentPage]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Vérifier si c'est un double-clic sur une image
    const target = e.target as HTMLElement;
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (target.tagName === 'IMG' && timeSinceLastClick < 300) {
      // Double-clic sur une image
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      e.stopPropagation();
      handleZoom();
      lastClickTimeRef.current = 0;
    } else if (target.tagName === 'IMG') {
      // Premier clic sur une image - attendre pour voir si c'est un double-clic
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        setShowControls(prev => !prev);
        clickTimeoutRef.current = null;
      }, 300);
    } else {
      // Clic ailleurs - toggle les contrôles immédiatement
      setShowControls(!showControls);
      lastClickTimeRef.current = 0;
    }
  }, [showControls, handleZoom]);

  return (
    <ReaderContainer onContainerClick={handleContainerClick}>
      <EndOfSeriesModal
        show={showEndMessage}
        onClose={onClose || (() => undefined)}
        currentPage={currentPage}
      />

      <ControlButtons
        showControls={showControls}
        onToggleControls={() => setShowControls(!showControls)}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onPageChange={navigateToPage}
        onClose={onClose}
        currentPage={currentPage}
        totalPages={pages.length}
        isDoublePage={isDoublePage}
        onToggleDoublePage={toggleDoublePage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => toggleFullscreen(document.body)}
        direction={direction}
        onToggleDirection={toggleDirection}
        showThumbnails={showThumbnails}
        onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
        onZoom={handleZoom}
        onForceReload={() => handleForceReload(currentPage, isDoublePage, (page) => shouldShowDoublePage(page, pages.length))}
      />

      <PageDisplay
        currentPage={currentPage}
        pages={pages}
        isDoublePage={isDoublePage}
        shouldShowDoublePage={(page) => shouldShowDoublePage(page, pages.length)}
        imageBlobUrls={imageBlobUrls}
        getPageUrl={getPageUrl}
      />

      <NavigationBar
        currentPage={currentPage}
        pages={pages}
        onPageChange={navigateToPage}
        showControls={showControls}
        showThumbnails={showThumbnails}
        book={book}
      />
    </ReaderContainer>
  );
}

