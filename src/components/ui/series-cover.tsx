import { ProgressBar } from "./progress-bar";
import { BookX } from "lucide-react";
import type { SeriesCoverProps } from "./cover-utils";

export function SeriesCover({
  series,
  alt = "Image de couverture",
  className,
  showProgressUi = true,
  isAnonymous = false,
}: SeriesCoverProps) {
  const isCompleted = isAnonymous ? false : series.bookCount === series.booksReadCount;

  const readBooks = isAnonymous ? 0 : series.booksReadCount;
  const totalBooks = series.bookCount;
  const showProgress = Boolean(!isAnonymous && showProgressUi && totalBooks > 0 && readBooks > 0 && !isCompleted);
  const missingCount = series.missingCount;

  return (
    <div className="relative w-full h-full">
      <img
        src={series.thumbnailUrl}
        alt={alt}
        loading="lazy"
        className={[
          "absolute inset-0 w-full h-full object-cover rounded-lg",
          isCompleted ? "opacity-50" : "",
          className || "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {showProgressUi && missingCount != null && missingCount > 0 && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-white shadow-md backdrop-blur-sm">
          <BookX className="h-3 w-3" />
          <span className="text-[10px] font-bold leading-none">{missingCount}</span>
        </div>
      )}
      {showProgress ? <ProgressBar progress={readBooks} total={totalBooks} type="series" /> : null}
    </div>
  );
}
