import { KomgaLibrary } from "@/types/komga";
import { Book, ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface LibraryGridProps {
  libraries: KomgaLibrary[];
  onLibraryClick?: (library: KomgaLibrary) => void;
  getLibraryThumbnailUrl: (libraryId: string) => string;
}

// Fonction utilitaire pour formater la date de manière sécurisée
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Date non disponible";
    }
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Erreur lors du formatage de la date:", error);
    return "Date non disponible";
  }
};

export function LibraryGrid({
  libraries,
  onLibraryClick,
  getLibraryThumbnailUrl,
}: LibraryGridProps) {
  if (!libraries.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Aucune bibliothèque disponible</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {libraries.map((library) => (
        <LibraryCard
          key={library.id}
          library={library}
          onClick={() => onLibraryClick?.(library)}
          getLibraryThumbnailUrl={getLibraryThumbnailUrl}
        />
      ))}
    </div>
  );
}

interface LibraryCardProps {
  library: KomgaLibrary;
  onClick?: () => void;
  getLibraryThumbnailUrl: (libraryId: string) => string;
}

function LibraryCard({ library, onClick, getLibraryThumbnailUrl }: LibraryCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col h-48 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden"
    >
      {/* Image de couverture */}
      <div className="absolute inset-0 bg-muted">
        {!imageError ? (
          <Image
            src={getLibraryThumbnailUrl(library.id)}
            alt={`Couverture de ${library.name}`}
            fill
            className="object-cover opacity-20 group-hover:opacity-30 transition-opacity"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <ImageOff className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="relative h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-4">
          <Book className="h-6 w-6 shrink-0" />
          <h3 className="text-lg font-semibold line-clamp-1">{library.name}</h3>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                library.unavailable
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-500"
              }`}
            >
              {library.unavailable ? "Non disponible" : "Disponible"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Dernière mise à jour : {formatDate(library.lastModified)}
          </div>
        </div>
      </div>
    </button>
  );
}
