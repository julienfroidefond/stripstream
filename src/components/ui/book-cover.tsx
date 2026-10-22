"use client";

import { ProgressBar } from "./progress-bar";
import type { BookCoverProps } from "./cover-utils";
import { MarkAsReadButton } from "./mark-as-read-button";
import { MarkAsUnreadButton } from "./mark-as-unread-button";
import { useTranslate } from "@/hooks/useTranslate";
import { useCoverLoaded } from "@/hooks/useCoverLoaded";
import { cn, formatDate } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";

// Fonction utilitaire pour obtenir les informations de statut de lecture
const getReadingStatusInfo = (
  book: BookCoverProps["book"],
  t: (key: string, options?: { [key: string]: string | number }) => string
) => {
  if (!book.readProgress) {
    return {
      label: t("books.status.unread"),
      className: "bg-amber-400/90 text-amber-950",
    };
  }

  if (book.readProgress.completed) {
    const readDate = book.readProgress.lastReadAt ? formatDate(book.readProgress.lastReadAt) : null;
    return {
      label: readDate ? t("books.status.readDate", { date: readDate }) : t("books.status.read"),
      className: "bg-emerald-400/90 text-emerald-950",
    };
  }

  const currentPage = book.readProgress?.page ?? 0;

  if (currentPage > 0) {
    return {
      label: t("books.status.progress", {
        current: currentPage,
        total: book.pageCount,
      }),
      className: "bg-teal-400/90 text-teal-950",
    };
  }

  return {
    label: t("books.status.unread"),
    className: "bg-amber-400/90 text-amber-950",
  };
};

export function BookCover(props: BookCoverProps) {
  return <BookCoverContent {...props} />;
}

function BookCoverContent({
  book,
  alt,
  className,
  showProgressUi = true,
  onSuccess,
  showControls = true,
  showOverlay = true,
  overlayVariant = "default",
  eager = false,
  fetchPriority = "auto",
}: BookCoverProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { ref, loaded, failed, onLoad, onError } = useCoverLoaded(
    book.thumbnailUrl.trim(),
    { eager }
  );

  const isCompleted = isAnonymous ? false : (book.readProgress?.completed || false);

  const currentPage = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
  const totalPages = book.pageCount;
  const showProgress = Boolean(!isAnonymous && showProgressUi && totalPages > 0 && currentPage > 0 && !isCompleted);

  const statusInfo = isAnonymous ? { label: "", className: "" } : getReadingStatusInfo(book, t);
  const isRead = isAnonymous ? false : (book.readProgress?.completed || false);
  const hasReadProgress = isAnonymous ? false : (book.readProgress !== null || currentPage > 0);

  const handleMarkAsRead = () => {
    onSuccess?.(book, "read");
  };

  const handleMarkAsUnread = () => {
    onSuccess?.(book, "unread");
  };

  return (
    <>
      <div className="relative w-full h-full">
        <img
          ref={ref}
          src={book.thumbnailUrl.trim()}
          alt={alt || t("books.defaultCoverAlt")}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={fetchPriority}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          className={cn(
            "absolute inset-0 h-full w-full object-cover rounded-lg transition-[opacity,scale] duration-600 ease-projection motion-reduce:transition-none",
            loaded
              ? cn("scale-100", isCompleted ? "opacity-50" : "opacity-100")
              : "scale-[1.03] opacity-0",
            className
          )}
        />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-surface-2 px-3 text-center">
            <span className="line-clamp-4 text-[11px] font-medium leading-snug text-muted-foreground">
              {book.title ||
                (book.number
                  ? t("navigation.volume", { number: book.number })
                  : t("books.defaultCoverAlt"))}
            </span>
          </div>
        )}
        {showProgress && <ProgressBar progress={currentPage} total={totalPages} type="book" />}
      </div>
      {/* Overlay avec les contrôles */}
      {(showControls || showOverlay) && (
        <div className="absolute inset-0 pointer-events-none">
          {showControls && (
            // Boutons en haut à droite avec un petit décalage
            <div className="absolute top-2 right-2 pointer-events-auto flex gap-1">
              {!isAnonymous && !isRead && (
                <MarkAsReadButton
                  bookId={book.id}
                  pagesCount={book.pageCount}
                  isRead={isRead}
                  onSuccess={() => handleMarkAsRead()}
                  className="bg-white/90 hover:bg-white text-black"
                />
              )}
              {!isAnonymous && hasReadProgress && (
                <MarkAsUnreadButton
                  bookId={book.id}
                  onSuccess={() => handleMarkAsUnread()}
                  className="bg-white/90 hover:bg-white text-black"
                />
              )}
            </div>
          )}
          {showOverlay && overlayVariant === "default" && (
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-4 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
              <p className="text-sm font-medium text-white text-left line-clamp-2">
                {book.title ||
                  (book.number
                    ? t("navigation.volume", { number: book.number })
                    : "")}
              </p>
              {!isAnonymous && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showOverlay && overlayVariant === "home" && (
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          <h3 className="font-medium text-sm text-white line-clamp-2">
            {book.title ||
              (book.number
                ? t("navigation.volume", { number: book.number })
                : "")}
          </h3>
          {!isAnonymous && (
            <p className="text-xs text-white/80 mt-1">
              {t("books.status.progress", {
                current: currentPage,
                total: book.pageCount,
              })}
            </p>
          )}
        </div>
      )}
    </>
  );
}
