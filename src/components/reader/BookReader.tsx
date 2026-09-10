"use client";

import { memo } from "react";
import type { BookReaderProps } from "./types";
import { useReaderState } from "./hooks/useReaderState";
import { ControlButtons } from "./components/ControlButtons";
import { NavigationBar } from "./components/NavigationBar";
import { EndOfSeriesModal } from "./components/EndOfSeriesModal";
import { PageDisplay } from "./components/PageDisplay";
import { ReaderContainer } from "./components/ReaderContainer";
import { ReaderInfoDialog } from "./components/ReaderInfoDialog";

export const BookReader = memo(function BookReader(props: BookReaderProps) {
  const s = useReaderState(props);

  return (
    <ReaderContainer onContainerClick={s.onToggleControls} background={s.readerBackground}>
      <ReaderInfoDialog
        open={s.showInfo}
        onOpenChange={s.onInfoOpenChange}
        book={props.book}
        currentPage={s.currentPage}
        readerInfo={props.readerInfo}
      />

      <EndOfSeriesModal
        show={s.showEndMessage}
        onClose={s.onClose}
        currentPage={s.currentPage}
      />

      <ControlButtons
        showControls={s.showControls}
        onToggleControls={s.onToggleControls}
        onToggleInfo={s.onToggleInfo}
        onPreviousPage={s.onPreviousPage}
        onNextPage={s.onNextPage}
        onPageChange={s.onPageChange}
        onClose={s.onClose}
        onRefresh={props.onRefresh}
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
        readerBackground={s.readerBackground}
        onReaderBackgroundChange={s.onReaderBackgroundChange}
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
});

BookReader.displayName = "BookReader";
