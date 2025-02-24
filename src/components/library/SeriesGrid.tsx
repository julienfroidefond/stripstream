"use client";

import { KomgaSeries } from "@/types/komga";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Cover } from "@/components/ui/cover";

interface SeriesGridProps {
  series: KomgaSeries[];
}

// Fonction utilitaire pour obtenir les informations de statut de lecture
const getReadingStatusInfo = (series: KomgaSeries) => {
  if (series.booksCount === 0) {
    return {
      label: "Pas de tomes",
      className: "bg-yellow-500/10 text-yellow-500",
    };
  }

  if (series.booksCount === series.booksReadCount) {
    return {
      label: "Lu",
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (series.booksReadCount > 0) {
    return {
      label: `${series.booksReadCount}/${series.booksCount}`,
      className: "bg-blue-500/10 text-blue-500",
    };
  }

  return {
    label: "Non lu",
    className: "bg-yellow-500/10 text-yellow-500",
  };
};

export function SeriesGrid({ series }: SeriesGridProps) {
  const router = useRouter();

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Aucune série disponible</p>
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
            alt={`Couverture de ${series.metadata.title}`}
            isCompleted={series.booksCount === series.booksReadCount}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <h3 className="font-medium text-sm text-white line-clamp-2">{series.metadata.title}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  getReadingStatusInfo(series).className
                }`}
              >
                {getReadingStatusInfo(series).label}
              </span>
              <span className="text-xs text-white/80">
                {series.booksCount} tome{series.booksCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
