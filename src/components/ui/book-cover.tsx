"use client";

import { ProgressBar } from "./progress-bar";
import type { BookCoverProps } from "./cover-utils";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { MarkAsReadButton } from "./mark-as-read-button";
import { MarkAsUnreadButton } from "./mark-as-unread-button";
import { BookOfflineButton } from "./book-offline-button";
import { useTranslate } from "@/hooks/useTranslate";
import { formatDate } from "@/lib/utils";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { WifiOff } from "lucide-react";
import { useAnonymous } from "@/contexts/AnonymousContext";

// Fonction utilitaire pour obtenir les informations de statut de lecture
const getReadingStatusInfo = (
  book: BookCoverProps["book"],
  t: (key: string, options?: { [key: string]: string | number }) => string
) => {
  if (!book.readProgress) {
    return {
      label: t("books.status.unread"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (book.readProgress.completed) {
    const readDate = book.readProgress.lastReadAt ? formatDate(book.readProgress.lastReadAt) : null;
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
        total: book.pageCount,
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
  alt,
  className,
  showProgressUi = true,
  onSuccess,
  showControls = true,
  showOverlay = true,
  overlayVariant = "default",
}: BookCoverProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { isAccessible } = useBookOfflineStatus(book.id);

  const isCompleted = isAnonymous ? false : (book.readProgress?.completed || false);

  const currentPage = isAnonymous ? 0 : ClientOfflineBookService.getCurrentPage(book);
  const totalPages = book.pageCount;
  const showProgress = Boolean(!isAnonymous && showProgressUi && totalPages > 0 && currentPage > 0 && !isCompleted);

  const statusInfo = isAnonymous ? { label: "", className: "" } : getReadingStatusInfo(book, t);
  const isRead = isAnonymous ? false : (book.readProgress?.completed || false);
  const hasReadProgress = isAnonymous ? false : (book.readProgress !== null || currentPage > 0);

  // Détermine si le livre doit être grisé (non accessible hors ligne)
  const isUnavailable = !isAccessible;

  const handleMarkAsRead = () => {
    onSuccess?.(book, "read");
  };

  const handleMarkAsUnread = () => {
    onSuccess?.(book, "unread");
  };

  return (
    <>
      <div className={`relative w-full h-full ${isUnavailable ? "opacity-40 grayscale" : ""}`}>
        <img
          src={book.thumbnailUrl.trim()}
          alt={alt || t("books.defaultCoverAlt")}
          loading="lazy"
          className={[
            "absolute inset-0 w-full h-full object-cover rounded-lg",
            isCompleted ? "opacity-50" : "",
            className || "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {showProgress && <ProgressBar progress={currentPage} total={totalPages} type="book" />}
        {/* Badge hors ligne si non accessible */}
        {isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-destructive/90 backdrop-blur-md text-destructive-foreground px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium shadow-lg">
              <WifiOff className="h-3 w-3" />
              <span>{t("books.status.offline")}</span>
            </div>
          </div>
        )}
      </div>
      {/* Overlay avec les contrôles */}
      {(showControls || showOverlay) && (
        <div className="absolute inset-0 pointer-events-none">
          {showControls && (
            // Boutons en haut à droite avec un petit décalage
            <div className="absolute top-2 right-2 pointer-events-auto flex gap-1">
              {!isAnonymous && !isRead && (
                <MarkAsReadButton
                  bookId={book.id}
                  pagesCount={book.pageCount}
                  isRead={isRead}
                  onSuccess={() => handleMarkAsRead()}
                  className="bg-white/90 hover:bg-white text-black shadow-sm"
                />
              )}
              {!isAnonymous && hasReadProgress && (
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
                {book.title ||
                  (book.number
                    ? t("navigation.volume", { number: book.number })
                    : "")}
              </p>
              {!isAnonymous && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showOverlay && overlayVariant === "home" && (
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          <h3 className="font-medium text-sm text-white line-clamp-2">
            {book.title ||
              (book.number
                ? t("navigation.volume", { number: book.number })
                : "")}
          </h3>
          {!isAnonymous && (
            <p className="text-xs text-white/80 mt-1">
              {t("books.status.progress", {
                current: currentPage,
                total: book.pageCount,
              })}
            </p>
          )}
        </div>
      )}
    </>
  );
}
