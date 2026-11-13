"use client";

import { ProgressBar } from "./progress-bar";
import type { BookCoverProps } from "./cover-utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useCoverLoaded } from "@/hooks/useCoverLoaded";
import { cn } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";

export function BookCover({
  book,
  alt,
  className,
  showProgressUi = true,
  eager = false,
  fetchPriority = "auto",
}: BookCoverProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { ref, status, loaded, failed, onLoad, onError } = useCoverLoaded(
    book.thumbnailUrl.trim(),
    { eager }
  );

  const isCompleted = isAnonymous ? false : (book.readProgress?.completed || false);

  const currentPage = isAnonymous ? 0 : (book.readProgress?.page ?? 0);
  const totalPages = book.pageCount;
  const showProgress = Boolean(!isAnonymous && showProgressUi && totalPages > 0 && currentPage > 0 && !isCompleted);

  return (
    <div className="relative w-full h-full" data-cover-state={status}>
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
  );
}
