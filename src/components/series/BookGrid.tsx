"use client";

import { KomgaBook } from "@/types/komga";
import { BookCover } from "@/components/ui/book-cover";
import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
}

export function BookGrid({ books, onBookClick }: BookGridProps) {
  const [localBooks, setLocalBooks] = useState(books);
  const { t } = useTranslate();

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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {localBooks.map((book) => {
        return (
          <div
            key={book.id}
            className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted"
          >
            <button
              onClick={() => onBookClick(book)}
              className="w-full h-full hover:opacity-100 transition-all"
            >
              <BookCover
                book={book}
                alt={t("books.coverAlt", {
                  title: book.metadata.title || `Tome ${book.metadata.number}`,
                })}
                onSuccess={(book, action) => handleOnSuccess(book, action)}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
