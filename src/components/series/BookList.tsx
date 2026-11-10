"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { BookCover, getBookReadingStatusInfo } from "@/components/ui/book-cover";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { CoverEdge } from "@/components/ui/cover-card";
import { memo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useTranslate } from "@/hooks/useTranslate";
import { useCoverInteraction } from "@/hooks/useCoverInteraction";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { FileText, BookX } from "lucide-react";
import { MarkAsReadButton } from "@/components/ui/mark-as-read-button";
import { MarkAsUnreadButton } from "@/components/ui/mark-as-unread-button";
import { DownloadBookButton } from "@/components/ui/download-book-button";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useRouter } from "next/navigation";

interface BookListProps {
  books: NormalizedBook[];
  onBookClick: (book: NormalizedBook) => void;
  isCompact?: boolean;
  onRefresh?: () => void;
}

interface BookListItemProps {
  book: NormalizedBook;
  onBookClick: (book: NormalizedBook) => void;
  onSuccess: (book: NormalizedBook, action: "read" | "unread") => void;
  isCompact?: boolean;
}

const BookListItem = memo(function BookListItem({ book, onBookClick, onSuccess, isCompact = false }: BookListItemProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { active, handlers } = useCoverInteraction<HTMLDivElement>();

  const isRead = isAnonymous ? false : (book.readProgress?.completed || false);
  const hasReadProgress = isAnonymous ? false : book.readProgress !== null;
  const currentPage = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
  const totalPages = book.pageCount;
  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const statusInfo = isAnonymous ? null : getBookReadingStatusInfo(book, t);
  const title =
    book.title ||
    (book.number ? t("navigation.volume", { number: book.number }) : "");
  const summary = book.summary?.trim() || null;

  const handleLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onBookClick(book);
  };

  if (isCompact) {
    return (
      <div
        className="group relative flex gap-3 rounded-lg border bg-card p-2 transition-colors hover:bg-accent/50"
        {...handlers}
      >
        {/* Couverture compacte */}
        <Link
          href={`/books/${book.id}`}
          aria-label={t("books.coverLink", { title })}
          onClick={handleLinkClick}
          className="relative block w-12 shrink-0 rounded-[2px_6px_6px_2px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-14"
        >
          <BookCoverScene
            active={active}
            contained
            className="w-full"
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
          />
        </Link>

        {/* Contenu compact */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          {/* Titre et statut */}
          <div className="flex items-center justify-between gap-2">
            <h3
              className="line-clamp-1 min-w-0 flex-1 text-sm font-medium text-muted-foreground"
              title={title}
            >
              <Link
                href={`/books/${book.id}`}
                onClick={handleLinkClick}
                className="rounded-sm transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {title}
              </Link>
            </h3>
            {statusInfo && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                  statusInfo.className
                )}
              >
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Métadonnées minimales */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {book.number && (
              <span>{t("navigation.volume", { number: book.number })}</span>
            )}
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>
                {totalPages} {totalPages > 1 ? t("books.pages_plural") : t("books.pages")}
              </span>
            </div>
            {!isAnonymous && (
              <DownloadBookButton
                url={book.downloadUrl}
                filename={title}
                className="ml-auto h-7 w-7 text-muted-foreground"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
      {...handlers}
    >
      {/* Couverture */}
      <Link
        href={`/books/${book.id}`}
        aria-label={t("books.coverLink", { title })}
        onClick={handleLinkClick}
        className="relative block w-20 shrink-0 rounded-[2px_6px_6px_2px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-24"
      >
        <BookCoverScene
          active={active}
          contained
          className="w-full"
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
        />
      </Link>

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Titre et numéro */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="line-clamp-1 text-sm font-medium leading-tight text-muted-foreground transition-colors group-hover:text-primary"
              title={title}
            >
              <Link
                href={`/books/${book.id}`}
                onClick={handleLinkClick}
                className="rounded-sm transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {title}
              </Link>
            </h3>
            {book.number && (
              <p className="mt-0.5 text-sm font-medium">
                {t("navigation.volume", { number: book.number })}
              </p>
            )}
          </div>

          {/* Badge de statut */}
          {statusInfo && (
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium shrink-0",
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </span>
          )}
        </div>

        {/* Métadonnées */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Pages */}
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>
              {totalPages} {totalPages > 1 ? t("books.pages_plural") : t("books.pages")}
            </span>
          </div>
        </div>

        {/* Description du tome */}
        {summary && (
          <p
            className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/90"
            title={summary}
          >
            {summary}
          </p>
        )}

        {/* Barre de progression */}
        {hasReadProgress && !isRead && currentPage > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% {t("books.completed")}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          {!isAnonymous && !isRead && (
            <MarkAsReadButton
              bookId={book.id}
              pagesCount={book.pageCount}
              isRead={isRead}
              onSuccess={() => onSuccess(book, "read")}
              className="text-xs"
            />
          )}
          {!isAnonymous && hasReadProgress && (
            <MarkAsUnreadButton
              bookId={book.id}
              onSuccess={() => onSuccess(book, "unread")}
              className="text-xs"
            />
          )}
          {!isAnonymous && (
            <DownloadBookButton
              url={book.downloadUrl}
              filename={title}
              className="h-8 w-8 text-muted-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
});

export function BookList({ books, onBookClick, isCompact = false, onRefresh }: BookListProps) {
  const { t } = useTranslate();
  const router = useRouter();

  const handleOnSuccess = useCallback(
    (_book: NormalizedBook, _action: "read" | "unread") => {
      // Rafraîchir les données après avoir marqué comme lu/non lu
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    },
    [onRefresh, router]
  );

  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground whitespace-pre-line">{t("books.empty")}</p>
      </div>
    );
  }

  return (
    <StaggerGroup className={cn("space-y-2", isCompact && "space-y-1")} reveal="scroll">
      {books.map((book) =>
        book.volumeType === "_missing" ? (
          <StaggerItem key={book.id}>
            <div
              className={cn(
                "group relative flex gap-3 p-2 rounded-lg border border-dashed border-orange-500/40 bg-muted/30 opacity-60",
              )}
            >
              <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded overflow-hidden bg-muted/50">
                {book.thumbnailUrl ? (
                  <img src={book.thumbnailUrl} alt={book.title} loading="lazy" className="w-full h-full object-cover rounded opacity-50" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookX className="h-5 w-5 text-orange-500/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-sm text-orange-400 truncate">{book.title}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 shrink-0">
                  {t("books.missingLabel")}
                </span>
              </div>
            </div>
          </StaggerItem>
        ) : (
          <StaggerItem key={book.id}>
            <BookListItem
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
