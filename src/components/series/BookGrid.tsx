"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { BookCover } from "@/components/ui/book-cover";
import { useState, useEffect, useRef } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { BookX } from "lucide-react";

interface BookGridProps {
  books: NormalizedBook[];
  onBookClick: (book: NormalizedBook) => void;
  isCompact?: boolean;
  onRefresh?: () => void;
}

interface BookCardProps {
  book: NormalizedBook;
  onBookClick: (book: NormalizedBook) => void;
  onSuccess: (book: NormalizedBook, action: "read" | "unread") => void;
  isCompact: boolean;
}

function MissingBookCard({ book, isCompact }: { book: NormalizedBook; isCompact: boolean }) {
  return (
    <div
      className={cn(
        "group relative aspect-[2/3] overflow-hidden rounded-lg border border-dashed border-orange-500/40 bg-muted/50 opacity-60",
        isCompact ? "" : ""
      )}
    >
      {book.thumbnailUrl ? (
        <img
          src={book.thumbnailUrl}
          alt={book.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <BookX className="h-8 w-8 text-orange-500/40" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-orange-300 font-medium truncate">{book.title}</p>
      </div>
      <div className="absolute top-1.5 right-1.5 rounded-full bg-orange-500/90 p-0.5">
        <BookX className="h-3 w-3 text-white" />
      </div>
    </div>
  );
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
              book.title ||
              (book.number
                ? t("navigation.volume", { number: book.number })
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

  const handleOnSuccess = (book: NormalizedBook, action: "read" | "unread") => {
    if (action === "read") {
      setLocalBooks(
        localBooks.map((previousBook) =>
          previousBook.id === book.id
            ? {
                ...previousBook,
                readProgress: {
                  completed: true,
                  page: previousBook.pageCount,
                  lastReadAt: new Date().toISOString(),
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
      {localBooks.map((book) =>
        book.volumeType === "_missing" ? (
          <MissingBookCard key={book.id} book={book} isCompact={isCompact} />
        ) : (
          <BookCard
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
