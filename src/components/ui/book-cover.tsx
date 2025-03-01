"use client";

import { CoverClient } from "./cover-client";
import { ProgressBar } from "./progress-bar";
import { BookCoverProps, getImageUrl } from "./cover-utils";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { MarkAsReadButton } from "./mark-as-read-button";
import { MarkAsUnreadButton } from "./mark-as-unread-button";
import { BookOfflineButton } from "./book-offline-button";
import { useTranslate } from "@/hooks/useTranslate";
import { KomgaBook } from "@/types/komga";
import { formatDate } from "@/lib/utils";

// Fonction utilitaire pour obtenir les informations de statut de lecture
const getReadingStatusInfo = (book: KomgaBook, t: (key: string, options?: any) => string) => {
  if (!book.readProgress) {
    return {
      label: t("books.status.unread"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (book.readProgress.completed) {
    const readDate = book.readProgress.readDate ? formatDate(book.readProgress.readDate) : null;
    return {
      label: readDate ? t("books.status.readDate", { date: readDate }) : t("books.status.read"),
      className: "bg-green-500/10 text-green-500",
    };
  }

  const currentPage = ClientOfflineBookService.getCurrentPage(book);

  if (currentPage > 0) {
    return {
      label: t("books.status.progress", {
        current: currentPage,
        total: book.media.pagesCount,
      }),
      className: "bg-blue-500/10 text-blue-500",
    };
  }

  return {
    label: t("books.status.unread"),
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

export function BookCover({
  book,
  alt = "Image de couverture",
  className,
  quality = 80,
  sizes = "100vw",
  showProgressUi = true,
  onSuccess,
  showControls = true,
  showOverlay = true,
  overlayVariant = "default",
}: BookCoverProps) {
  const { t } = useTranslate();

  const imageUrl = getImageUrl("book", book.id);
  const isCompleted = book.readProgress?.completed || false;

  const currentPage = ClientOfflineBookService.getCurrentPage(book);
  const totalPages = book.media.pagesCount;
  const showProgress =
    showProgressUi && currentPage && totalPages && currentPage > 0 && !isCompleted;

  const statusInfo = getReadingStatusInfo(book, t);
  const isRead = book.readProgress?.completed || false;
  const hasReadProgress = book.readProgress !== null;

  const handleMarkAsRead = () => {
    onSuccess?.(book, "read");
  };

  const handleMarkAsUnread = () => {
    onSuccess?.(book, "unread");
  };

  return (
    <>
      <div className="relative w-full h-full">
        <CoverClient
          imageUrl={imageUrl}
          alt={alt}
          className={className}
          quality={quality}
          sizes={sizes}
          isCompleted={isCompleted}
        />
        {showProgress && <ProgressBar progress={currentPage} total={totalPages} type="book" />}
      </div>
      {/* Overlay avec les contrôles */}
      {(showControls || showOverlay) && (
        <div className="absolute inset-0 pointer-events-none">
          {showControls && (
            // Boutons en haut à droite avec un petit décalage
            <div className="absolute top-2 right-2 pointer-events-auto flex gap-1">
              {!isRead && (
                <MarkAsReadButton
                  bookId={book.id}
                  pagesCount={book.media.pagesCount}
                  isRead={isRead}
                  onSuccess={() => handleMarkAsRead()}
                  className="bg-white/90 hover:bg-white text-black shadow-sm"
                />
              )}
              {hasReadProgress && (
                <MarkAsUnreadButton
                  bookId={book.id}
                  onSuccess={() => handleMarkAsUnread()}
                  className="bg-white/90 hover:bg-white text-black shadow-sm"
                />
              )}
              <BookOfflineButton
                book={book}
                className="bg-white/90 hover:bg-white text-black shadow-sm"
              />
            </div>
          )}
          {showOverlay && overlayVariant === "default" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
              <p className="text-sm font-medium text-white text-left line-clamp-2">
                {book.metadata.title || `Tome ${book.metadata.number}`}
              </p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {showOverlay && overlayVariant === "home" && (
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          <h3 className="font-medium text-sm text-white line-clamp-2">
            {book.metadata.title || `Tome ${book.metadata.number}`}
          </h3>
          <p className="text-xs text-white/80 mt-1">
            {currentPage} / {book.media.pagesCount}
          </p>
        </div>
      )}
    </>
  );
}
