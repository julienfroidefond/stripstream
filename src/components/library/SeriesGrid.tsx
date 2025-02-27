"use client";

import { KomgaSeries } from "@/types/komga";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Cover } from "@/components/ui/cover";
import { useTranslate } from "@/hooks/useTranslate";

interface SeriesGridProps {
  series: KomgaSeries[];
}

// Utility function to get reading status info
const getReadingStatusInfo = (series: KomgaSeries, t: (key: string, options?: any) => string) => {
  if (series.booksCount === 0) {
    return {
      label: t("series.status.noBooks"),
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (series.booksCount === series.booksReadCount) {
    return {
      label: t("series.status.read"),
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (series.booksReadCount > 0) {
    return {
      label: t("series.status.progress", {
        read: series.booksReadCount,
        total: series.booksCount,
      }),
      className: "bg-blue-500/10 text-blue-500",
    };
  }

  return {
    label: t("series.status.unread"),
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

export function SeriesGrid({ series }: SeriesGridProps) {
  const router = useRouter();
  const { t } = useTranslate();

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("series.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {series.map((series) => (
        <button
          key={series.id}
          onClick={() => router.push(`/series/${series.id}`)}
          className={cn(
            "group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted",
            series.booksCount === series.booksReadCount && "opacity-50"
          )}
        >
          <Cover
            type="series"
            id={series.id}
            alt={t("series.coverAlt", { title: series.metadata.title })}
            isCompleted={series.booksCount === series.booksReadCount}
            readBooks={series.booksReadCount}
            totalBooks={series.booksCount}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <h3 className="font-medium text-sm text-white line-clamp-2">{series.metadata.title}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  getReadingStatusInfo(series, t).className
                }`}
              >
                {getReadingStatusInfo(series, t).label}
              </span>
              <span className="text-xs text-white/80">
                {t("series.books", { count: series.booksCount })}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
