"use client";

import { KomgaBook } from "@/types/komga";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick?: (book: KomgaBook) => void;
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
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onClick={() => onBookClick?.(book)}
          getBookThumbnailUrl={getBookThumbnailUrl}
        />
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
            <ImageOff className="w-12 h-12" />
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
          {book.size && <div className="text-[10px]">{book.size}</div>}
        </div>
      </div>
    </button>
  );
}
