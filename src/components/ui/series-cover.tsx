"use client";

import { CoverClient } from "./cover-client";
import { ProgressBar } from "./progress-bar";
import type { SeriesCoverProps } from "./cover-utils";
import { getImageUrl } from "./cover-utils";
import { useImageUrl } from "@/hooks/useImageUrl";

export function SeriesCover({
  series,
  alt = "Image de couverture",
  className,
  showProgressUi = true,
}: SeriesCoverProps) {
  const baseUrl = getImageUrl("series", series.id);
  const imageUrl = useImageUrl(baseUrl);
  const isCompleted = series.booksCount === series.booksReadCount;

  const readBooks = series.booksReadCount;
  const totalBooks = series.booksCount;
  const showProgress = showProgressUi && readBooks && totalBooks && readBooks > 0 && !isCompleted;

  return (
    <div className="relative w-full h-full">
      <CoverClient imageUrl={imageUrl} alt={alt} className={className} isCompleted={isCompleted} />
      {showProgress && <ProgressBar progress={readBooks} total={totalBooks} type="series" />}
    </div>
  );
}
