"use client";

import { KomgaSeries } from "@/types/komga";
import { Book, ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SeriesGridProps {
  series: KomgaSeries[];
  serverUrl: string;
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

export function SeriesGrid({ series, serverUrl }: SeriesGridProps) {
  const router = useRouter();

  if (!series.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Aucune série disponible</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {series.map((series) => (
        <SeriesCard
          key={series.id}
          series={series}
          onClick={() => router.push(`/series/${series.id}`)}
          serverUrl={serverUrl}
        />
      ))}
    </div>
  );
}

interface SeriesCardProps {
  series: KomgaSeries;
  onClick?: () => void;
  serverUrl: string;
}

function SeriesCard({ series, onClick, serverUrl }: SeriesCardProps) {
  const [imageError, setImageError] = useState(false);
  const statusInfo = getReadingStatusInfo(series);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted"
    >
      {!imageError ? (
        <Image
          src={`/api/komga/images/series/${series.id}/thumbnail`}
          alt={`Couverture de ${series.metadata.title}`}
          fill
          className={`object-cover ${
            series.booksCount === series.booksReadCount ? "opacity-50" : ""
          }`}
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 20vw"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff className="w-12 h-12" />
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
