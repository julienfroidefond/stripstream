"use client";

import { IntentLink } from "@/components/common/IntentLink";
import { memo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { BookX, FileText } from "lucide-react";

import { BookCover } from "@/components/ui/book-cover";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { CoverCard, CoverEdge } from "@/components/ui/cover-card";
import { DownloadBookButton } from "@/components/ui/download-book-button";
import { Progress } from "@/components/ui/progress";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useReadProgressMutations } from "@/contexts/ReadProgressMutationsContext";
import { useCoverInteraction } from "@/hooks/useCoverInteraction";
import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedBook } from "@/lib/providers/types";
import { cn } from "@/lib/utils";
import { buildBookCardView, type BookCardView } from "./book-card-view";
import { MarkAsReadButton, MarkAsUnreadButton } from "./BookReadButtons";
import type { DisplayBook } from "./bookGrouping";

export type BookCardLayout = "grid" | "list";

export interface BookCardProps {
  item: DisplayBook;
  onBookClick: (book: NormalizedBook) => void;
  layout: BookCardLayout;
  isCompact?: boolean;
}

interface BookLayoutProps {
  book: NormalizedBook;
  view: BookCardView;
  isAnonymous: boolean;
  onNavigate: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onMarkRead: (read: boolean) => void;
  readPending: boolean;
}

interface ListBookCardProps extends BookLayoutProps {
  isCompact: boolean;
}

interface BookReadActionsProps {
  view: BookCardView;
  onMarkRead: (read: boolean) => void;
  pending: boolean;
  className?: string;
}

interface BookCardActionsProps {
  book: NormalizedBook;
  view: BookCardView;
  isAnonymous: boolean;
  placement: BookCardLayout | "compact";
  onMarkRead: (read: boolean) => void;
  readPending: boolean;
}

function BookReadActions({
  view,
  onMarkRead,
  pending,
  className,
}: BookReadActionsProps) {
  return (
    <>
      {!view.isRead && (
        <MarkAsReadButton
          onClick={() => onMarkRead(true)}
          pending={pending}
          className={className}
        />
      )}
      {view.hasReadProgress && (
        <MarkAsUnreadButton
          onClick={() => onMarkRead(false)}
          pending={pending}
          className={className}
        />
      )}
    </>
  );
}

/**
 * L'unique surface d'actions d'une carte de livre.
 *
 * Grille, liste et liste compacte placent les mêmes actions différemment ; la
 * visibilité des actions reste ici ; le marquage lui-même (optimisme, toast,
 * rollback, refresh) appartient à `useReadProgressMutations`.
 */
function BookCardActions({
  book,
  view,
  isAnonymous,
  placement,
  onMarkRead,
  readPending,
}: BookCardActionsProps) {
  if (placement === "grid") {
    if (isAnonymous) return null;

    return (
      <>
        {book.downloadUrl && (
          <div className="absolute left-2 top-2 z-30">
            <DownloadBookButton
              url={book.downloadUrl}
              filename={view.title}
              className="bg-white/90 text-black hover:bg-white"
            />
          </div>
        )}
        {(!view.isRead || view.hasReadProgress) && (
          <div className="absolute right-2 top-2 z-30 flex gap-1">
            <BookReadActions
              view={view}
              onMarkRead={onMarkRead}
              pending={readPending}
              className="bg-white/90 text-black hover:bg-white"
            />
          </div>
        )}
      </>
    );
  }

  if (placement === "compact") {
    if (isAnonymous) return null;

    return (
      <DownloadBookButton
        url={book.downloadUrl}
        filename={view.title}
        className="ml-auto h-7 w-7 text-muted-foreground"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 mt-auto pt-2">
      {!isAnonymous && (
        <BookReadActions
          view={view}
          onMarkRead={onMarkRead}
          pending={readPending}
          className="text-xs"
        />
      )}
      {!isAnonymous && (
        <DownloadBookButton
          url={book.downloadUrl}
          filename={view.title}
          className="h-8 w-8 text-muted-foreground"
        />
      )}
    </div>
  );
}

function GridBookCard({
  book,
  view,
  isAnonymous,
  onNavigate,
  onMarkRead,
  readPending,
}: BookLayoutProps) {
  return (
    <CoverCard
      href={`/books/${book.id}`}
      ariaLabel={view.coverAriaLabel}
      onNavigate={onNavigate}
      cover={
        <>
          <BookCover
            book={book}
            alt={view.coverAlt}
            className="rounded-none"
          />
          <CoverEdge />
        </>
      }
      overlay={
        <BookCardActions
          book={book}
          view={view}
          isAnonymous={isAnonymous}
          placement="grid"
          onMarkRead={onMarkRead}
          readPending={readPending}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {view.volumeLabel && <span>{view.volumeLabel}</span>}
        <span>{view.pagesLabel}</span>
        {view.statusInfo && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              view.statusInfo.className
            )}
          >
            {view.statusInfo.label}
          </span>
        )}
      </div>
    </CoverCard>
  );
}

function ListBookCover({
  book,
  view,
  active,
  onNavigate,
  className,
}: {
  book: NormalizedBook;
  view: BookCardView;
  active: boolean;
  onNavigate: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  className: string;
}) {
  return (
    <IntentLink
      href={`/books/${book.id}`}
      aria-label={view.coverAriaLabel}
      onClick={onNavigate}
      className={cn(
        "relative block shrink-0 rounded-[2px_6px_6px_2px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <BookCoverScene
        active={active}
        contained
        className="w-full"
        cover={
          <>
            <BookCover
              book={book}
              alt={view.coverAlt}
              className="rounded-none"
            />
            <CoverEdge />
          </>
        }
      />
    </IntentLink>
  );
}

function ListBookTitle({
  book,
  title,
  onNavigate,
  className,
}: {
  book: NormalizedBook;
  title: string;
  onNavigate: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  className: string;
}) {
  return (
    <h3 className={className} title={title}>
      <IntentLink
        href={`/books/${book.id}`}
        onClick={onNavigate}
        className="rounded-sm transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {title}
      </IntentLink>
    </h3>
  );
}

function ListBookCard({
  book,
  view,
  isAnonymous,
  isCompact,
  onNavigate,
  onMarkRead,
  readPending,
}: ListBookCardProps) {
  const { active, handlers } = useCoverInteraction<HTMLDivElement>();

  if (isCompact) {
    return (
      <div
        className="group relative flex gap-3 rounded-lg border bg-card p-2 transition-colors hover:bg-accent/50"
        {...handlers}
      >
        <ListBookCover
          book={book}
          view={view}
          active={active}
          onNavigate={onNavigate}
          className="w-12 sm:w-14"
        />

        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          <div className="flex items-center justify-between gap-2">
            <ListBookTitle
              book={book}
              title={view.title}
              onNavigate={onNavigate}
              className="line-clamp-1 min-w-0 flex-1 text-sm font-medium text-muted-foreground"
            />
            {view.statusInfo && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                  view.statusInfo.className
                )}
              >
                {view.statusInfo.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {view.volumeLabel && <span>{view.volumeLabel}</span>}
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{view.pagesLabel}</span>
            </div>
            <BookCardActions
              book={book}
              view={view}
              isAnonymous={isAnonymous}
              placement="compact"
              onMarkRead={onMarkRead}
          readPending={readPending}
            />
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
      <ListBookCover
        book={book}
        view={view}
        active={active}
        onNavigate={onNavigate}
        className="w-20 sm:w-24"
      />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ListBookTitle
              book={book}
              title={view.title}
              onNavigate={onNavigate}
              className="line-clamp-1 text-sm font-medium leading-tight text-muted-foreground transition-colors group-hover:text-primary"
            />
            {view.volumeLabel && (
              <p className="mt-0.5 text-sm font-medium">{view.volumeLabel}</p>
            )}
          </div>

          {view.statusInfo && (
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium shrink-0",
                view.statusInfo.className
              )}
            >
              {view.statusInfo.label}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{view.pagesLabel}</span>
          </div>
        </div>

        {view.summary && (
          <p
            className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/90"
            title={view.summary}
          >
            {view.summary}
          </p>
        )}

        {view.hasReadProgress && !view.isRead && view.currentPage > 0 && (
          <div className="space-y-1">
            <Progress value={view.progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(view.progressPercentage)}% {view.completedLabel}
            </p>
          </div>
        )}

        <BookCardActions
          book={book}
          view={view}
          isAnonymous={isAnonymous}
          placement="list"
          onMarkRead={onMarkRead}
          readPending={readPending}
        />
      </div>
    </div>
  );
}

type MissingBook = Extract<DisplayBook, { kind: "missing" }>;

function MissingBookCard({
  book,
  layout,
}: {
  book: MissingBook;
  layout: BookCardLayout;
}) {
  const { t } = useTranslate();

  if (layout === "grid") {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="relative aspect-2/3 overflow-hidden rounded-lg border border-dashed border-orange-500/40 bg-muted/50">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
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
  }

  return (
    <div className="group relative flex gap-3 rounded-lg border border-dashed border-orange-500/40 bg-muted/30 p-2 opacity-60">
      <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded overflow-hidden bg-muted/50">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover rounded opacity-50"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookX className="h-5 w-5 text-orange-500/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium text-sm text-orange-400 truncate">
          {book.title}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 shrink-0">
          {t("books.missingLabel")}
        </span>
      </div>
    </div>
  );
}

interface AvailableBookCardProps {
  book: NormalizedBook;
  onBookClick: (book: NormalizedBook) => void;
  layout: BookCardLayout;
  isCompact: boolean;
}

function AvailableBookCard({
  book: serverBook,
  onBookClick,
  layout,
  isCompact,
}: AvailableBookCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { resolveBook, markBook, pendingBook } = useReadProgressMutations();
  const book = resolveBook(serverBook);
  const view = buildBookCardView(book, t, isAnonymous);
  const readPending = pendingBook(serverBook.id) !== null;

  const handleNavigate = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      onBookClick(serverBook);
    },
    [serverBook, onBookClick]
  );

  // Le seam compare l'état serveur observé : on lui passe le livre serveur,
  // jamais sa version optimiste.
  const handleMarkRead = useCallback(
    (read: boolean) => {
      void markBook(serverBook, read);
    },
    [markBook, serverBook]
  );

  if (layout === "grid") {
    return (
      <GridBookCard
        book={book}
        view={view}
        isAnonymous={isAnonymous}
        onNavigate={handleNavigate}
        onMarkRead={handleMarkRead}
        readPending={readPending}
      />
    );
  }

  return (
    <ListBookCard
      book={book}
      view={view}
      isAnonymous={isAnonymous}
      isCompact={isCompact}
      onNavigate={handleNavigate}
      onMarkRead={handleMarkRead}
      readPending={readPending}
    />
  );
}

/**
 * Une seule carte de livre, deux layouts.
 *
 * La carte rend soit un livre, soit l'emplacement d'un tome manquant ; le
 * discriminant `DisplayBook` décide, et un emplacement n'a ni action ni lien.
 * L'état de lecture affiché et les marquages passent par
 * `useReadProgressMutations`. La grille et la liste ne choisissent que la
 * disposition.
 */
export const BookCard = memo(function BookCard({
  item,
  onBookClick,
  layout,
  isCompact = false,
}: BookCardProps) {
  if (item.kind === "missing") {
    return <MissingBookCard book={item} layout={layout} />;
  }

  return (
    <AvailableBookCard
      book={item.book}
      onBookClick={onBookClick}
      layout={layout}
      isCompact={isCompact}
    />
  );
});
