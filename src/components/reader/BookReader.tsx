"use client";

import type { BookReaderProps } from "./types";
import { useReaderState } from "./hooks/useReaderState";
import { ControlButtons } from "./components/ControlButtons";
import { NavigationBar } from "./components/NavigationBar";
import { EndOfSeriesModal } from "./components/EndOfSeriesModal";
import { PageDisplay } from "./components/PageDisplay";
import { ReaderContainer } from "./components/ReaderContainer";

export function BookReader(props: BookReaderProps) {
  const s = useReaderState(props);

  return (
    <ReaderContainer onContainerClick={s.onToggleControls}>
      <EndOfSeriesModal
        show={s.showEndMessage}
        onClose={s.onClose}
        currentPage={s.currentPage}
      />

      <ControlButtons
        showControls={s.showControls}
        onToggleControls={s.onToggleControls}
        onPreviousPage={s.onPreviousPage}
        onNextPage={s.onNextPage}
        onPageChange={s.onPageChange}
        onClose={s.onClose}
        currentPage={s.currentPage}
        totalPages={s.totalPages}
        isDoublePage={s.isDoublePage}
        onToggleDoublePage={s.onToggleDoublePage}
        isFullscreen={s.isFullscreen}
        isFullscreenAvailable={s.isFullscreenAvailable}
        onToggleFullscreen={s.onToggleFullscreen}
        direction={s.direction}
        onToggleDirection={s.onToggleDirection}
        showThumbnails={s.showThumbnails}
        onToggleThumbnails={s.onToggleThumbnails}
        fitMode={s.fitMode}
        onCycleFitMode={s.onCycleFitMode}
      />

      <PageDisplay
        currentPage={s.currentPage}
        pages={s.pages}
        isDoublePage={s.isDoublePage}
        shouldShowDoublePage={s.shouldShowDoublePage}
        imageBlobUrls={s.imageBlobUrls}
        imageErrors={s.imageErrors}
        onRetryImage={s.onRetryImage}
        isRTL={s.isRTL}
        fitMode={s.fitMode}
      />

      <NavigationBar
        currentPage={s.currentPage}
        pages={s.pages}
        onPageChange={s.onPageChange}
        showControls={s.showControls}
        showThumbnails={s.showThumbnails}
        book={s.book}
      />
    </ReaderContainer>
  );
}
