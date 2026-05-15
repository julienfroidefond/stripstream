import { ProgressBar } from "./progress-bar";
import { BookX, CircleDot, CircleCheck, CirclePause, CircleX, type LucideIcon } from "lucide-react";
import type { SeriesCoverProps } from "./cover-utils";


const seriesStatusStyles: Record<string, { bg: string; icon: LucideIcon }> = {
  ongoing: { bg: "bg-blue-500/90", icon: CircleDot },
  ended: { bg: "bg-green-500/90", icon: CircleCheck },
  hiatus: { bg: "bg-yellow-500/90", icon: CirclePause },
  cancelled: { bg: "bg-red-500/90", icon: CircleX },
};

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
  const statusStyle = series.seriesStatus ? seriesStatusStyles[series.seriesStatus] : null;

  return (
    <div className="relative w-full h-full">
      <img
        src={series.thumbnailUrl}
        alt={alt}
        loading="lazy"
        className={[
          "absolute inset-0 w-full h-full object-cover",
          isCompleted ? "opacity-50" : "",
          className || "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {showProgressUi && statusStyle && series.seriesStatus && (
        <div className={`absolute top-1.5 left-1.5 flex items-center rounded-full ${statusStyle.bg} p-0.5 text-white shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity`}>
          <statusStyle.icon className="h-3.5 w-3.5" />
        </div>
      )}
      {showProgressUi && missingCount != null && missingCount > 0 && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-white shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <BookX className="h-3 w-3" />
          <span className="text-[10px] font-bold leading-none">{missingCount}</span>
        </div>
      )}
      {showProgress ? <ProgressBar progress={readBooks} total={totalBooks} type="series" /> : null}
    </div>
  );
}
