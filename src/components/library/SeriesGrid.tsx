"use client";

import { KomgaSeries } from "@/types/komga";
import { Book, ImageOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageLoader } from "@/components/ui/image-loader";
import { cn } from "@/lib/utils";

interface SeriesGridProps {
  series: KomgaSeries[];
}

// Fonction utilitaire pour obtenir les informations de lecture d'une série
const getReadingStatusInfo = (series: KomgaSeries) => {
  const { booksCount, booksReadCount, booksUnreadCount } = series;
  const booksInProgressCount = booksCount - (booksReadCount + booksUnreadCount);

  if (booksReadCount === booksCount) {
    return {
      label: "Lu",
      className: "bg-green-500/10 text-green-500",
    };
  }

  if (booksInProgressCount > 0 || (booksReadCount > 0 && booksReadCount < booksCount)) {
    return {
      label: `${booksReadCount}/${booksCount}`,
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
        <SeriesCard
          key={series.id}
          series={series}
          onClick={() => router.push(`/series/${series.id}`)}
        />
      ))}
    </div>
  );
}

interface SeriesCardProps {
  series: KomgaSeries;
  onClick?: () => void;
}

function SeriesCard({ series, onClick }: SeriesCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const statusInfo = getReadingStatusInfo(series);
  const isCompleted = series.booksCount === series.booksReadCount;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted",
        isCompleted && "opacity-50"
      )}
    >
      {!imageError ? (
        <>
          <ImageLoader isLoading={isLoading} />
          <Image
            src={`/api/komga/images/series/${series.id}/thumbnail`}
            alt={`Couverture de ${series.metadata.title}`}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 20vw"
            onError={() => setImageError(true)}
            onLoad={() => setIsLoading(false)}
            loading="lazy"
            quality={50}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      )}

      {/* Overlay avec les informations au survol */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <h3 className="font-medium text-sm text-white line-clamp-2">{series.metadata.title}</h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          <span className="text-xs text-white/80">
            {series.booksCount} tome{series.booksCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
