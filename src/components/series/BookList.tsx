"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { BookCover } from "@/components/ui/book-cover";
import { memo, useCallback } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { formatDate } from "@/lib/utils";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { Progress } from "@/components/ui/progress";
import { FileText, BookX } from "lucide-react";
import { MarkAsReadButton } from "@/components/ui/mark-as-read-button";
import { MarkAsUnreadButton } from "@/components/ui/mark-as-unread-button";
import { BookOfflineButton } from "@/components/ui/book-offline-button";
import { useAnonymous } from "@/contexts/AnonymousContext";

interface BookListProps {
  books: NormalizedBook[];
  onBookClick: (book: NormalizedBook) => void;
  isCompact?: boolean;
  onRefresh?: () => void;
}

interface BookListItemProps {
  book: NormalizedBook;
  onBookClick: (book: NormalizedBook) => void;
  onSuccess: (book: NormalizedBook, action: "read" | "unread") => void;
  isCompact?: boolean;
}

const BookListItem = memo(function BookListItem({ book, onBookClick, onSuccess, isCompact = false }: BookListItemProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { isAccessible } = useBookOfflineStatus(book.id);

  const handleClick = () => {
    if (!isAccessible) return;
    onBookClick(book);
  };

  const isRead = isAnonymous ? false : (book.readProgress?.completed || false);
  const hasReadProgress = isAnonymous ? false : book.readProgress !== null;
  const currentPage = isAnonymous ? 0 : ClientOfflineBookService.getCurrentPage(book);
  const totalPages = book.pageCount;
  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const getStatusInfo = () => {
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

    if (currentPage > 0) {
      return {
        label: t("books.status.progress", {
          current: currentPage,
          total: totalPages,
        }),
        className: "bg-blue-500/10 text-blue-500",
      };
    }

    return {
      label: t("books.status.unread"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  };

  const statusInfo = getStatusInfo();
  const title =
    book.title ||
    (book.number ? t("navigation.volume", { number: book.number }) : "");

  if (isCompact) {
    return (
      <div
        className={cn(
          "group relative flex gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
          !isAccessible && "opacity-60"
        )}
      >
        {/* Couverture compacte */}
        <div
          className={cn(
            "relative w-12 h-16 sm:w-14 sm:h-20 flex-shrink-0 rounded overflow-hidden bg-muted",
            isAccessible && "cursor-pointer"
          )}
          onClick={handleClick}
        >
          <BookCover
            book={book}
            alt={t("books.coverAlt", { title })}
            showControls={false}
            showOverlay={false}
            className="w-full h-full"
          />
        </div>

        {/* Contenu compact */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          {/* Titre et statut */}
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                "font-medium text-sm sm:text-base line-clamp-1 flex-1 min-w-0",
                isAccessible && "cursor-pointer hover:text-primary transition-colors"
              )}
              onClick={handleClick}
            >
              {title}
            </h3>
            {!isAnonymous && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                  statusInfo.className
                )}
              >
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Métadonnées minimales */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {book.number && (
              <span>{t("navigation.volume", { number: book.number })}</span>
            )}
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>
                {totalPages} {totalPages > 1 ? t("books.pages_plural") : t("books.pages")}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        !isAccessible && "opacity-60"
      )}
    >
      {/* Couverture */}
      <div
        className={cn(
          "relative w-20 h-28 sm:w-24 sm:h-36 flex-shrink-0 rounded overflow-hidden bg-muted",
          isAccessible && "cursor-pointer"
        )}
        onClick={handleClick}
      >
        <BookCover
          book={book}
          alt={t("books.coverAlt", { title })}
          showControls={false}
          showOverlay={false}
          className="w-full h-full"
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Titre et numéro */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold text-base sm:text-lg line-clamp-2",
                isAccessible && "cursor-pointer hover:text-primary transition-colors"
              )}
              onClick={handleClick}
            >
              {title}
            </h3>
            {book.number && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("navigation.volume", { number: book.number })}
              </p>
            )}
          </div>

          {/* Badge de statut */}
          {!isAnonymous && (
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </span>
          )}
        </div>

        {/* Métadonnées */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Pages */}
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>
              {totalPages} {totalPages > 1 ? t("books.pages_plural") : t("books.pages")}
            </span>
          </div>
        </div>

        {/* Barre de progression */}
        {hasReadProgress && !isRead && currentPage > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% {t("books.completed")}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          {!isAnonymous && !isRead && (
            <MarkAsReadButton
              bookId={book.id}
              pagesCount={book.pageCount}
              isRead={isRead}
              onSuccess={() => onSuccess(book, "read")}
              className="text-xs"
            />
          )}
          {!isAnonymous && hasReadProgress && (
            <MarkAsUnreadButton
              bookId={book.id}
              onSuccess={() => onSuccess(book, "unread")}
              className="text-xs"
            />
          )}
          <BookOfflineButton book={book} className="text-xs" />
        </div>
      </div>
    </div>
  );
});

export function BookList({ books, onBookClick, isCompact = false, onRefresh }: BookListProps) {
  const { t } = useTranslate();

  const handleOnSuccess = useCallback(
    (_book: NormalizedBook, _action: "read" | "unread") => {
      // Rafraîchir les données après avoir marqué comme lu/non lu
      onRefresh?.();
    },
    [onRefresh]
  );

  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground whitespace-pre-line">{t("books.empty")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", isCompact && "space-y-1")}>
      {books.map((book) =>
        book.volumeType === "_missing" ? (
          <div
            key={book.id}
            className={cn(
              "group relative flex gap-3 p-2 rounded-lg border border-dashed border-orange-500/40 bg-muted/30 opacity-60",
            )}
          >
            <div className="relative w-12 h-16 sm:w-14 sm:h-20 flex-shrink-0 rounded overflow-hidden bg-muted/50">
              {book.thumbnailUrl ? (
                <img src={book.thumbnailUrl} alt={book.title} loading="lazy" className="w-full h-full object-cover rounded opacity-50" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookX className="h-5 w-5 text-orange-500/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="font-medium text-sm text-orange-400 truncate">{book.title}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 flex-shrink-0">
                {t("books.missingLabel")}
              </span>
            </div>
          </div>
        ) : (
          <BookListItem
            key={book.id}
            book={book}
            onBookClick={onBookClick}
            onSuccess={handleOnSuccess}
            isCompact={isCompact}
          />
        )
      )}
    </div>
  );
}
