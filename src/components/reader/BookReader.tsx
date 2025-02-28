/* eslint-disable @next/next/no-img-element */
"use client";

import { BookReaderProps } from "./types";
import { useOrientation } from "./hooks/useOrientation";
import { usePageNavigation } from "./hooks/usePageNavigation";
import { usePageCache } from "./hooks/usePageCache";
import { usePageUrls } from "./hooks/usePageUrls";
import { usePreloadPages } from "./hooks/usePreloadPages";
import { useFullscreen } from "./hooks/useFullscreen";
import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationBar } from "./components/NavigationBar";
import { ControlButtons } from "./components/ControlButtons";
import { ReaderContent } from "./components/ReaderContent";
import { useReadingDirection } from "./hooks/useReadingDirection";

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [isDoublePage, setIsDoublePage] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const isLandscape = useOrientation();
  const { direction, toggleDirection, isRTL } = useReadingDirection();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const {
    currentPage,
    navigateToPage,
    isLoading,
    setIsLoading,
    secondPageLoading,
    setSecondPageLoading,
    handlePreviousPage,
    handleNextPage,
    shouldShowDoublePage,
    zoomLevel,
    panPosition,
    handleDoubleClick,
  } = usePageNavigation({
    book,
    pages,
    isDoublePage,
    onClose,
    direction,
  });

  const { preloadPage, getPageUrl, cleanCache } = usePageCache({
    book,
    pages,
  });

  const { currentPageUrl, nextPageUrl } = usePageUrls({
    currentPage,
    isDoublePage,
    shouldShowDoublePage,
    getPageUrl,
    setIsLoading,
    setSecondPageLoading,
  });

  usePreloadPages({
    currentPage,
    totalPages: pages.length,
    isDoublePage,
    shouldShowDoublePage,
    preloadPage,
    cleanCache,
  });

  // Effet pour gérer le mode double page automatiquement en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  const handleThumbnailLoad = useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPage) {
        setIsLoading(false);
      } else if (pageNumber === currentPage + 1) {
        setSecondPageLoading(false);
      }
    },
    [currentPage, setIsLoading, setSecondPageLoading]
  );

  return (
    <div
      ref={readerRef}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden touch-none"
    >
      <div
        className="relative h-full flex flex-col items-center justify-center"
        onClick={() => setShowControls(!showControls)}
      >
        <div className="relative h-full w-full flex items-center justify-center">
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
            onToggleDoublePage={() => setIsDoublePage(!isDoublePage)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => toggleFullscreen(readerRef.current)}
            direction={direction}
            onToggleDirection={toggleDirection}
          />

          <ReaderContent
            currentPage={currentPage}
            currentPageUrl={currentPageUrl}
            nextPageUrl={nextPageUrl}
            isLoading={isLoading}
            secondPageLoading={secondPageLoading}
            isDoublePage={isDoublePage}
            shouldShowDoublePage={shouldShowDoublePage}
            isRTL={isRTL}
            onThumbnailLoad={handleThumbnailLoad}
            zoomLevel={zoomLevel}
            panPosition={panPosition}
            onDoubleClick={handleDoubleClick}
          />

          <NavigationBar
            currentPage={currentPage}
            pages={pages}
            onPageChange={navigateToPage}
            showControls={showControls}
            book={book}
          />
        </div>
      </div>
    </div>
  );
}
