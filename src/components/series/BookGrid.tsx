"use client";

import type { KomgaBook } from "@/types/komga";
import { BookCover } from "@/components/ui/book-cover";
import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
  isCompact?: boolean;
}

export function BookGrid({ books, onBookClick, isCompact = false }: BookGridProps) {
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
    <div
      className={cn(
        "grid gap-4",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
    >
      {localBooks.map((book) => {
        return (
          <div
            key={book.id}
            className={cn(
              "group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted",
              isCompact ? "hover:scale-105 transition-transform" : ""
            )}
          >
            <div
              onClick={() => onBookClick(book)}
              className="w-full h-full hover:opacity-100 transition-all cursor-pointer"
            >
              <BookCover
                book={book}
                alt={t("books.coverAlt", {
                  title: book.metadata.title || 
                    (book.metadata.number 
                      ? t("navigation.volume", { number: book.metadata.number })
                      : ""),
                })}
                onSuccess={(book, action) => handleOnSuccess(book, action)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
