"use client";

import { useRouter } from "next/navigation";
import { KomgaSeries, KomgaBook } from "@/types/komga";
import { useEffect, useState } from "react";
import { BookGrid } from "@/components/series/BookGrid";
import { ImageOff } from "lucide-react";
import Image from "next/image";

interface SeriesData {
  series: KomgaSeries;
  books: KomgaBook[];
}

export default function SeriesPage({ params }: { params: { seriesId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<SeriesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        const response = await fetch(`/api/komga/series/${params.seriesId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la récupération de la série");
        }
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error("Erreur:", error);
        setError(error instanceof Error ? error.message : "Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeriesData();
  }, [params.seriesId]);

  const handleBookClick = (book: KomgaBook) => {
    router.push(`/books/${book.id}`);
  };

  const getBookThumbnailUrl = (bookId: string) => {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-72 bg-muted rounded-lg" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-[2/3] bg-muted" />
                <div className="p-2 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-8">
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">{error || "Données non disponibles"}</p>
        </div>
      </div>
    );
  }

  const { series, books } = data;

  return (
    <div className="container py-8 space-y-8">
      {/* En-tête de la série */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Couverture */}
        <div className="w-48 shrink-0">
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
            {!imageError ? (
              <Image
                src={`/api/komga/images/series/${series.id}/thumbnail`}
                alt={`Couverture de ${series.metadata.title}`}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Informations */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{series.metadata.title}</h1>
            {series.metadata.status && (
              <span
                className={`mt-2 inline-block px-2 py-1 rounded-full text-xs ${
                  series.metadata.status === "ENDED"
                    ? "bg-green-500/10 text-green-500"
                    : series.metadata.status === "ONGOING"
                    ? "bg-blue-500/10 text-blue-500"
                    : series.metadata.status === "ABANDONED"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {series.metadata.status === "ENDED"
                  ? "Terminé"
                  : series.metadata.status === "ONGOING"
                  ? "En cours"
                  : series.metadata.status === "ABANDONED"
                  ? "Abandonné"
                  : "En pause"}
              </span>
            )}
          </div>

          {series.metadata.summary && (
            <p className="text-muted-foreground">{series.metadata.summary}</p>
          )}

          <div className="space-y-1 text-sm text-muted-foreground">
            {series.metadata.publisher && (
              <div>
                <span className="font-medium">Éditeur :</span> {series.metadata.publisher}
              </div>
            )}
            {series.metadata.genres?.length > 0 && (
              <div>
                <span className="font-medium">Genres :</span> {series.metadata.genres.join(", ")}
              </div>
            )}
            {series.metadata.tags?.length > 0 && (
              <div>
                <span className="font-medium">Tags :</span> {series.metadata.tags.join(", ")}
              </div>
            )}
            {series.metadata.language && (
              <div>
                <span className="font-medium">Langue :</span>{" "}
                {new Intl.DisplayNames([navigator.language], { type: "language" }).of(
                  series.metadata.language
                )}
              </div>
            )}
            {series.metadata.ageRating && (
              <div>
                <span className="font-medium">Âge recommandé :</span> {series.metadata.ageRating}+
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grille des tomes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Tomes <span className="text-muted-foreground">({books.length})</span>
        </h2>
        <BookGrid
          books={books}
          onBookClick={handleBookClick}
          getBookThumbnailUrl={getBookThumbnailUrl}
        />
      </div>
    </div>
  );
}
