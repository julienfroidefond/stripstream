"use client";

import { KomgaBook } from "@/types/komga";
import { formatDate } from "@/lib/utils";
import { Cover } from "@/components/ui/cover";
import { MarkAsReadButton } from "@/components/ui/mark-as-read-button";
import { MarkAsUnreadButton } from "@/components/ui/mark-as-unread-button";
import { BookOfflineButton } from "@/components/ui/book-offline-button";
import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
}

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

export function BookGrid({ books, onBookClick }: BookGridProps) {
  const [localBooks, setLocalBooks] = useState(books);
  const { t } = useTranslate();

  // Synchroniser localBooks avec les props books
  useEffect(() => {
    setLocalBooks(books);
  }, [books]);

  if (!localBooks.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("books.empty")}</p>
      </div>
    );
  }

  const handleMarkAsRead = (bookId: string) => {
    setLocalBooks((prevBooks) =>
      prevBooks.map((book) =>
        book.id === bookId
          ? {
              ...book,
              readProgress: {
                ...(book.readProgress || {}),
                completed: true,
                readDate: new Date().toISOString(),
                page: book.media.pagesCount,
                created: book.readProgress?.created || new Date().toISOString(),
                lastModified: new Date().toISOString(),
              },
            }
          : book
      )
    );
  };

  const handleMarkAsUnread = (bookId: string) => {
    setLocalBooks((prevBooks) =>
      prevBooks.map((book) =>
        book.id === bookId
          ? {
              ...book,
              readProgress: null,
            }
          : book
      )
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {localBooks.map((book) => {
        const statusInfo = getReadingStatusInfo(book, t);
        const isRead = book.readProgress?.completed || false;
        const hasReadProgress = book.readProgress !== null;
        const currentPage = ClientOfflineBookService.getCurrentPage(book);

        return (
          <div
            key={book.id}
            className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted"
          >
            <button
              onClick={() => onBookClick(book)}
              className="w-full h-full hover:opacity-100 transition-all"
            >
              <Cover
                type="book"
                id={book.id}
                alt={t("books.coverAlt", {
                  title: book.metadata.title || `Tome ${book.metadata.number}`,
                })}
                isCompleted={isRead}
                currentPage={currentPage}
                totalPages={book.media.pagesCount}
              />
            </button>

            {/* Overlay avec les contrôles */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Boutons en haut à droite avec un petit décalage */}
              <div className="absolute top-2 right-2 pointer-events-auto flex gap-1">
                {!isRead && (
                  <MarkAsReadButton
                    bookId={book.id}
                    pagesCount={book.media.pagesCount}
                    isRead={isRead}
                    onSuccess={() => handleMarkAsRead(book.id)}
                    className="bg-white/90 hover:bg-white text-black shadow-sm"
                  />
                )}
                {hasReadProgress && (
                  <MarkAsUnreadButton
                    bookId={book.id}
                    onSuccess={() => handleMarkAsUnread(book.id)}
                    className="bg-white/90 hover:bg-white text-black shadow-sm"
                  />
                )}
                <BookOfflineButton
                  book={book}
                  className="bg-white/90 hover:bg-white text-black shadow-sm"
                />
              </div>

              {/* Informations en bas - visible au survol uniquement */}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
