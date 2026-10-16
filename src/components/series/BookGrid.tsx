"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { BookCover } from "@/components/ui/book-cover";
import { memo, useCallback, useRef } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { BookX } from "lucide-react";
import { GlowLayer, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";

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
}

const MissingBookCard = memo(function MissingBookCard({ book }: { book: NormalizedBook }) {
  return (
    <div
      className={cn(
        "group relative aspect-2/3 overflow-hidden rounded-lg border border-dashed border-orange-500/40 bg-muted/50 opacity-60"
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
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
        <p className="text-xs text-orange-300 font-medium truncate">{book.title}</p>
      </div>
      <div className="absolute top-1.5 right-1.5 rounded-full bg-orange-500/90 p-0.5">
        <BookX className="h-3 w-3 text-white" />
      </div>
    </div>
  );
});

const BookCard = memo(function BookCard({ book, onBookClick, onSuccess }: BookCardProps) {
  const { t } = useTranslate();
  const cardRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(cardRef);

  const handleClick = () => {
    onBookClick(book);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleGlow}
      className={cn(
        "group relative aspect-2/3 overflow-hidden rounded-lg bg-muted"
      )}
    >
      <div
        onClick={handleClick}
        className="w-full h-full cursor-pointer transition-opacity"
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
      <GlowLayer />
    </div>
  );
});

export function BookGrid({ books, onBookClick, isCompact = false, onRefresh }: BookGridProps) {
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
    <StaggerGroup
      className={cn(
        "grid gap-4",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
      reveal="scroll"
      effect="settle"
      stagger={0.09}
    >
      {books.map((book) =>
        book.volumeType === "_missing" ? (
          <StaggerItem key={book.id}>
            <MissingBookCard book={book} />
          </StaggerItem>
        ) : (
          <StaggerItem key={book.id}>
            <BookCard
              book={book}
              onBookClick={onBookClick}
              onSuccess={handleOnSuccess}
            />
          </StaggerItem>
        )
      )}
    </StaggerGroup>
  );
}
