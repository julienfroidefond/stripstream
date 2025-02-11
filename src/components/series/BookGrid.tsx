"use client";

import { KomgaBook } from "@/types/komga";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
  getBookThumbnailUrl: (bookId: string) => string;
}

export function BookGrid({ books, onBookClick, getBookThumbnailUrl }: BookGridProps) {
  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Aucun tome disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {books.map((book) => (
        <button
          key={book.id}
          onClick={() => onBookClick(book)}
          className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted hover:opacity-80 transition-opacity"
        >
          <Image
            src={getBookThumbnailUrl(book.id)}
            alt={book.metadata.title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 16.66vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-sm font-medium text-white text-left line-clamp-2">
              {book.metadata.title}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

interface BookCardProps {
  book: KomgaBook;
  onClick?: () => void;
  getBookThumbnailUrl: (bookId: string) => string;
}

function BookCard({ book, onClick, getBookThumbnailUrl }: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  const getReadingStatusInfo = () => {
    if (!book.readProgress) {
      return {
        label: "Non lu",
        className: "bg-yellow-500/10 text-yellow-500",
      };
    }

    if (book.readProgress.completed) {
      const readDate = book.readProgress.readDate
        ? new Date(book.readProgress.readDate).toLocaleDateString()
        : null;
      return {
        label: readDate ? `Lu le ${readDate}` : "Lu",
        className: "bg-green-500/10 text-green-500",
      };
    }

    if (book.readProgress.page > 0) {
      return {
        label: `Page ${book.readProgress.page}/${book.media.pagesCount}`,
        className: "bg-blue-500/10 text-blue-500",
      };
    }

    return {
      label: "Non lu",
      className: "bg-yellow-500/10 text-yellow-500",
    };
  };

  const statusInfo = getReadingStatusInfo();

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden"
    >
      {/* Image de couverture */}
      <div className="relative aspect-[2/3] bg-muted">
        {!imageError ? (
          <Image
            src={getBookThumbnailUrl(book.id)}
            alt={`Couverture de ${book.metadata.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16.666vw, 16.666vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-12 w-12" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-col p-2">
        <h3 className="font-medium line-clamp-2 text-sm">
          {book.metadata.title || `Tome ${book.metadata.number}`}
        </h3>
        <div className="mt-1 text-xs text-muted-foreground space-y-1">
          {book.metadata.releaseDate && (
            <div>{new Date(book.metadata.releaseDate).toLocaleDateString()}</div>
          )}
          <div className="flex items-center">
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
          {book.size && <div className="text-[10px]">{book.size}</div>}
        </div>
      </div>
    </button>
  );
}
