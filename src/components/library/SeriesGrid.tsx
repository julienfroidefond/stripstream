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
const getReadingStatusInfo = (series: KomgaSeries): { label: string; className: string } => {
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
      label: "En cours",
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
      className="group relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden"
    >
      {/* Image de couverture */}
      <div className="relative aspect-[2/3] bg-muted">
        {!imageError ? (
          <Image
            src={`/api/komga/images/series/${series.id}/thumbnail`}
            alt={`Couverture de ${series.metadata.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 20vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-col p-2">
        <h3 className="font-medium line-clamp-2 text-sm">{series.metadata.title}</h3>
        <div className="mt-1 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Book className="h-3 w-3" />
            <span>
              {series.booksCount} tome{series.booksCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center">
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
