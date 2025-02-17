"use client";

import { KomgaBook } from "@/types/komga";
import { formatDate } from "@/lib/utils";
import { Cover } from "@/components/ui/cover";

interface BookGridProps {
  books: KomgaBook[];
  onBookClick: (book: KomgaBook) => void;
}

// Fonction utilitaire pour obtenir les informations de statut de lecture
const getReadingStatusInfo = (book: KomgaBook) => {
  if (!book.readProgress) {
    return {
      label: "Non lu",
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (book.readProgress.completed) {
    const readDate = book.readProgress.readDate ? formatDate(book.readProgress.readDate) : null;
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

export function BookGrid({ books, onBookClick }: BookGridProps) {
  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Aucun tome disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {books.map((book) => {
        const statusInfo = getReadingStatusInfo(book);
        return (
          <button
            key={book.id}
            onClick={() => onBookClick(book)}
            className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted hover:opacity-100 transition-all"
          >
            <Cover
              type="book"
              id={book.id}
              alt={`Couverture de ${book.metadata.title || `Tome ${book.metadata.number}`}`}
              isCompleted={book.readProgress?.completed}
            />
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
          </button>
        );
      })}
    </div>
  );
}
