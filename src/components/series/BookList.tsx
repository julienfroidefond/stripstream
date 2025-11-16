"use client";

import type { KomgaBook } from "@/types/komga";
import { BookCover } from "@/components/ui/book-cover";
import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { formatDate } from "@/lib/utils";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { Progress } from "@/components/ui/progress";
import { Calendar, FileText, User, Tag } from "lucide-react";
import { MarkAsReadButton } from "@/components/ui/mark-as-read-button";
import { MarkAsUnreadButton } from "@/components/ui/mark-as-unread-button";
import { BookOfflineButton } from "@/components/ui/book-offline-button";

interface BookListProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
}

interface BookListItemProps {
  book: KomgaBook;
  onBookClick: (book: KomgaBook) => void;
  onSuccess: (book: KomgaBook, action: "read" | "unread") => void;
}

function BookListItem({ book, onBookClick, onSuccess }: BookListItemProps) {
  const { t } = useTranslate();
  const { isAccessible } = useBookOfflineStatus(book.id);

  const handleClick = () => {
    if (!isAccessible) return;
    onBookClick(book);
  };

  const isRead = book.readProgress?.completed || false;
  const hasReadProgress = book.readProgress !== null;
  const currentPage = ClientOfflineBookService.getCurrentPage(book);
  const totalPages = book.media.pagesCount;
  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const getStatusInfo = () => {
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
  const title = book.metadata.title || 
    (book.metadata.number 
      ? t("navigation.volume", { number: book.metadata.number })
      : book.name);

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
            {book.metadata.number && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("navigation.volume", { number: book.metadata.number })}
              </p>
            )}
          </div>
          
          {/* Badge de statut */}
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex-shrink-0", statusInfo.className)}>
            {statusInfo.label}
          </span>
        </div>

        {/* Résumé */}
        {book.metadata.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 hidden sm:block">
            {book.metadata.summary}
          </p>
        )}

        {/* Métadonnées */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Pages */}
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>
              {totalPages} {totalPages > 1 ? t("books.pages_plural") : t("books.pages")}
            </span>
          </div>

          {/* Auteurs */}
          {book.metadata.authors && book.metadata.authors.length > 0 && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">
                {book.metadata.authors.map(a => a.name).join(", ")}
              </span>
            </div>
          )}

          {/* Date de sortie */}
          {book.metadata.releaseDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(book.metadata.releaseDate)}</span>
            </div>
          )}

          {/* Tags */}
          {book.metadata.tags && book.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span className="line-clamp-1">
                {book.metadata.tags.slice(0, 3).join(", ")}
                {book.metadata.tags.length > 3 && ` +${book.metadata.tags.length - 3}`}
              </span>
            </div>
          )}
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
          {!isRead && (
            <MarkAsReadButton
              bookId={book.id}
              pagesCount={book.media.pagesCount}
              isRead={isRead}
              onSuccess={() => onSuccess(book, "read")}
              className="text-xs"
            />
          )}
          {hasReadProgress && (
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
}

export function BookList({ books, onBookClick }: BookListProps) {
  const [localBooks, setLocalBooks] = useState(books);
  const { t } = useTranslate();

  useEffect(() => {
    setLocalBooks(books);
  }, [books]);

  if (!localBooks.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground whitespace-pre-line">{t("books.empty")}</p>
      </div>
    );
  }

  const handleOnSuccess = (book: KomgaBook, action: "read" | "unread") => {
    if (action === "read") {
      setLocalBooks(
        localBooks.map((previousBook) =>
          previousBook.id === book.id
            ? {
                ...previousBook,
                readProgress: {
                  completed: true,
                  page: previousBook.media.pagesCount,
                  readDate: new Date().toISOString(),
                  created: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                },
              }
            : previousBook
        )
      );
    } else if (action === "unread") {
      setLocalBooks(
        localBooks.map((previousBook) =>
          previousBook.id === book.id
            ? {
                ...previousBook,
                readProgress: null,
              }
            : previousBook
        )
      );
    }
  };

  return (
    <div className="space-y-2">
      {localBooks.map((book) => (
        <BookListItem
          key={book.id}
          book={book}
          onBookClick={onBookClick}
          onSuccess={handleOnSuccess}
        />
      ))}
    </div>
  );
}

