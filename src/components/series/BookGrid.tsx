"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { BookCover, getBookReadingStatusInfo } from "@/components/ui/book-cover";
import { CoverCard, CoverEdge } from "@/components/ui/cover-card";
import { memo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { BookX } from "lucide-react";
import { DownloadBookButton } from "@/components/ui/download-book-button";
import { MarkAsReadButton } from "@/components/ui/mark-as-read-button";
import { MarkAsUnreadButton } from "@/components/ui/mark-as-unread-button";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";

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
  isCompact?: boolean;
}

const MissingBookCard = memo(function MissingBookCard({ book }: { book: NormalizedBook }) {
  const { t } = useTranslate();

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative aspect-2/3 overflow-hidden rounded-lg border border-dashed border-orange-500/40 bg-muted/50">
        {book.thumbnailUrl ? (
          <img
            src={book.thumbnailUrl}
            alt={book.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-lg object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookX className="h-8 w-8 text-orange-500/40" />
          </div>
        )}
        <div className="absolute right-1.5 top-1.5 rounded-full bg-orange-500/90 p-0.5">
          <BookX className="h-3 w-3 text-white" />
        </div>
      </div>
      <div className="min-w-0 space-y-1 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight text-orange-600 dark:text-orange-400">
          {book.title}
        </h3>
        <span className="inline-flex rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
          {t("books.missingLabel")}
        </span>
      </div>
    </div>
  );
});

const BookCard = memo(function BookCard({
  book,
  onBookClick,
  onSuccess,
  isCompact = false,
}: BookCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const title =
    book.title ||
    (book.number ? t("navigation.volume", { number: book.number }) : "");
  const totalPages = book.pageCount;
  const pagesLabel = `${totalPages} ${
    totalPages > 1 ? t("books.pages_plural") : t("books.pages")
  }`;
  const statusInfo = isAnonymous ? null : getBookReadingStatusInfo(book, t);
  const isRead = isAnonymous ? false : Boolean(book.readProgress?.completed);
  const hasReadProgress = isAnonymous ? false : book.readProgress !== null;

  const handleNavigate = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onBookClick(book);
  };

  return (
    <CoverCard
      href={`/books/${book.id}`}
      ariaLabel={t("books.coverLink", { title })}
      onNavigate={handleNavigate}
      cover={
        <>
          <BookCover
            book={book}
            alt={t("books.coverAlt", { title })}
            showControls={false}
            showOverlay={false}
            className="rounded-none"
          />
          <CoverEdge />
        </>
      }
      overlay={
        !isAnonymous ? (
          <>
            {book.downloadUrl && (
              <div className="absolute left-2 top-2 z-30">
                <DownloadBookButton
                  url={book.downloadUrl}
                  filename={title}
                  className="bg-white/90 text-black hover:bg-white"
                />
              </div>
            )}
            {(!isRead || hasReadProgress) && (
              <div className="absolute right-2 top-2 z-30 flex gap-1">
                {!isRead && (
                  <MarkAsReadButton
                    bookId={book.id}
                    pagesCount={book.pageCount}
                    isRead={isRead}
                    onSuccess={() => onSuccess(book, "read")}
                    className="bg-white/90 text-black hover:bg-white"
                  />
                )}
                {hasReadProgress && (
                  <MarkAsUnreadButton
                    bookId={book.id}
                    onSuccess={() => onSuccess(book, "unread")}
                    className="bg-white/90 text-black hover:bg-white"
                  />
                )}
              </div>
            )}
          </>
        ) : null
      }
    >
      <h3
        className={cn(
          "line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary",
          isCompact && "line-clamp-1"
        )}
      >
        {title}
      </h3>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {book.number && (
          <span>{t("navigation.volume", { number: book.number })}</span>
        )}
        <span>{pagesLabel}</span>
        {statusInfo && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        )}
      </div>
    </CoverCard>
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
        "grid gap-x-4 gap-y-7 md:gap-x-5",
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
          <StaggerItem key={book.id} className="relative h-full">
            <MissingBookCard book={book} />
          </StaggerItem>
        ) : (
          <StaggerItem key={book.id} className="relative h-full">
            <BookCard
              book={book}
              onBookClick={onBookClick}
              onSuccess={handleOnSuccess}
              isCompact={isCompact}
            />
          </StaggerItem>
        )
      )}
    </StaggerGroup>
  );
}
