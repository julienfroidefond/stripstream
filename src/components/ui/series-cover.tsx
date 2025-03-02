"use client";

import { CoverClient } from "./cover-client";
import { ProgressBar } from "./progress-bar";
import type { SeriesCoverProps } from "./cover-utils";
import { getImageUrl } from "./cover-utils";

export function SeriesCover({
  series,
  alt = "Image de couverture",
  className,
  quality = 80,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  showProgressUi = true,
}: SeriesCoverProps) {
  const imageUrl = getImageUrl("series", series.id);
  const isCompleted = series.booksCount === series.booksReadCount;

  const readBooks = series.booksReadCount;
  const totalBooks = series.booksCount;
  const showProgress = showProgressUi && readBooks && totalBooks && readBooks > 0 && !isCompleted;

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
      {showProgress && <ProgressBar progress={readBooks} total={totalBooks} type="series" />}
    </div>
  );
}
