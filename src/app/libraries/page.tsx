"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KomgaLibrary } from "@/types/komga";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { storageService } from "@/lib/services/storage.service";

export default function LibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<KomgaLibrary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await fetch("/api/komga/libraries");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la récupération des bibliothèques");
        }

        const data = await response.json();
        setLibraries(data);
      } catch (error) {
        console.error("Erreur:", error);
        setError(error instanceof Error ? error.message : "Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibraries();
  }, []);

  const handleLibraryClick = (library: KomgaLibrary) => {
    router.push(`/libraries/${library.id}`);
  };

  const getLibraryThumbnailUrl = (libraryId: string): string => {
    return `/api/komga/thumbnail/libraries/${libraryId}/thumbnail`;
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Bibliothèques</h1>
            <p className="text-muted-foreground mt-2">Chargement des bibliothèques...</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-lg border bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Bibliothèques</h1>
            <p className="text-muted-foreground mt-2">Une erreur est survenue</p>
          </div>
          <div className="rounded-md bg-destructive/15 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Bibliothèques</h1>
          <p className="text-muted-foreground mt-2">Explorez vos bibliothèques Komga</p>
        </div>

        <LibraryGrid
          libraries={libraries}
          onLibraryClick={handleLibraryClick}
          getLibraryThumbnailUrl={getLibraryThumbnailUrl}
        />
      </div>
    </div>
  );
}
