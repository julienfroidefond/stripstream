import { ProgressBar } from "./progress-bar";
import type { SeriesCoverProps } from "./cover-utils";

export function SeriesCover({
  series,
  alt = "Image de couverture",
  className,
  showProgressUi = true,
}: SeriesCoverProps) {
  const isCompleted = series.bookCount === series.booksReadCount;

  const readBooks = series.booksReadCount;
  const totalBooks = series.bookCount;
  const showProgress = Boolean(showProgressUi && totalBooks > 0 && readBooks > 0 && !isCompleted);

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
      {showProgress ? <ProgressBar progress={readBooks} total={totalBooks} type="series" /> : null}
    </div>
  );
}
