import { Book } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { KomgaLibrary } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";

interface LibraryGridProps {
  libraries: KomgaLibrary[];
  onLibraryClick?: (library: KomgaLibrary) => void;
}

// Utility function to format date safely
const formatDate = (dateString: string, locale: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Date unavailable";
    }
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date unavailable";
  }
};

export function LibraryGrid({ libraries, onLibraryClick }: LibraryGridProps) {
  const { t } = useTranslate();

  if (!libraries.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("library.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {libraries.map((library) => (
        <LibraryCard key={library.id} library={library} onClick={() => onLibraryClick?.(library)} />
      ))}
    </div>
  );
}

interface LibraryCardProps {
  library: KomgaLibrary;
  onClick?: () => void;
}

function LibraryCard({ library, onClick }: LibraryCardProps) {
  const { t, i18n } = useTranslate();

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col h-48 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden"
    >
      {/* Cover image */}
      <div className="absolute inset-0 bg-muted">
        <div className="w-full h-full opacity-20 group-hover:opacity-30 transition-opacity">
          <Cover
            type="series"
            id={library.id}
            alt={t("library.coverAlt", { name: library.name })}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={25}
            readBooks={library.booksReadCount}
            totalBooks={library.booksCount}
          />
        </div>
      </div>

      {/* Content */}
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
              {t(library.unavailable ? "library.status.unavailable" : "library.status.available")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("library.lastUpdated", {
              date: formatDate(library.lastModified, i18n.language === "fr" ? "fr-FR" : "en-US"),
            })}
          </div>
        </div>
      </div>
    </button>
  );
}
