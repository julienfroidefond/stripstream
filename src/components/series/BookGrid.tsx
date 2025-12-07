"use client";

import type { KomgaBook } from "@/types/komga";
import { BookCover } from "@/components/ui/book-cover";
import { useState, useEffect, useRef } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
  isCompact?: boolean;
  onRefresh?: () => void;
}

interface BookCardProps {
  book: KomgaBook;
  onBookClick: (book: KomgaBook) => void;
  onSuccess: (book: KomgaBook, action: "read" | "unread") => void;
  isCompact: boolean;
}

function BookCard({ book, onBookClick, onSuccess, isCompact }: BookCardProps) {
  const { t } = useTranslate();
  const { isAccessible } = useBookOfflineStatus(book.id);

  const handleClick = () => {
    // Ne pas permettre le clic si le livre n'est pas accessible
    if (!isAccessible) return;
    onBookClick(book);
  };

  return (
    <div
      className={cn(
        "group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted",
        isCompact ? "hover:scale-105 transition-transform" : "",
        !isAccessible ? "cursor-not-allowed" : ""
      )}
    >
      <div
        onClick={handleClick}
        className={cn(
          "w-full h-full hover:opacity-100 transition-all",
          isAccessible ? "cursor-pointer" : "cursor-not-allowed"
        )}
      >
        <BookCover
          book={book}
          alt={t("books.coverAlt", {
            title:
              book.metadata.title ||
              (book.metadata.number
                ? t("navigation.volume", { number: book.metadata.number })
                : ""),
          })}
          onSuccess={(book, action) => onSuccess(book, action)}
        />
      </div>
    </div>
  );
}

export function BookGrid({ books, onBookClick, isCompact = false, onRefresh }: BookGridProps) {
  const [localBooks, setLocalBooks] = useState(books);
  const { t } = useTranslate();
  const previousBookIdsRef = useRef<string>(books.map((b) => b.id).join(","));

  useEffect(() => {
    // Ne réinitialiser que si les IDs des livres ont changé (nouvelle page, nouveau filtre, etc.)
    const newIds = books.map((b) => b.id).join(",");
    if (previousBookIdsRef.current !== newIds) {
      setLocalBooks(books);
      previousBookIdsRef.current = newIds;
    }
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
    // Rafraîchir les données après avoir marqué comme lu/non lu
    onRefresh?.();
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
    >
      {localBooks.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onBookClick={onBookClick}
          onSuccess={handleOnSuccess}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
}
