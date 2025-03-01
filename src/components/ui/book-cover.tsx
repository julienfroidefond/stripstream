"use client";

import { CoverClient } from "./cover-client";
import { ProgressBar } from "./progress-bar";
import { BookCoverProps, getImageUrl } from "./cover-utils";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";

export function BookCover({
  book,
  alt = "Image de couverture",
  className,
  quality = 80,
  sizes = "100vw",
}: BookCoverProps) {
  if (!book) return null;

  const imageUrl = getImageUrl("book", book.id);
  const isCompleted = book.readProgress?.completed || false;

  const currentPage = ClientOfflineBookService.getCurrentPage(book);
  const totalPages = book.media.pagesCount;
  const showProgress = currentPage && totalPages && currentPage > 0 && !isCompleted;

  return (
    <div className="relative w-full h-full">
      <CoverClient
        imageUrl={imageUrl}
        alt={alt}
        className={className}
        quality={quality}
        sizes={sizes}
        isCompleted={isCompleted}
      />
      {showProgress && <ProgressBar progress={currentPage} total={totalPages} type="book" />}
    </div>
  );
}
