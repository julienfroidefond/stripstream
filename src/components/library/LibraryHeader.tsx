import { Library } from "lucide-react";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";
import { RefreshButton } from "./RefreshButton";
import { ScanButton } from "./ScanButton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeriesCover } from "@/components/ui/series-cover";

interface LibraryHeaderProps {
  library: KomgaLibrary;
  seriesCount: number;
  series: KomgaSeries[];
}

const getHeaderSeries = (series: KomgaSeries[]) => {
  if (series.length === 0) {
    return { featured: null, background: null };
  }

  const featured = series[0] ?? null;

  if (!featured) {
    return { featured: null, background: null };
  }

  const background = series[1] ?? featured;

  return { featured, background };
};

export function LibraryHeader({
  library,
  seriesCount,
  series,
}: LibraryHeaderProps) {
  const { featured, background } = getHeaderSeries(series);
  const seriesLabel = `${seriesCount} ${seriesCount > 1 ? "series" : "serie"}`;

  return (
    <div className="relative min-h-[200px] md:h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/40" />
        {background ? (
          <SeriesCover
            series={background}
            alt=""
            className="blur-sm scale-105 brightness-50"
            showProgressUi={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}
      </div>

      <div className="relative container mx-auto px-4 py-8 h-full">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start h-full">
          <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden shadow-lg flex-shrink-0">
            {featured ? (
              <div className="relative w-full h-full">
                <SeriesCover
                  series={featured}
                  alt={`Couverture de ${library.name}`}
                  className="w-full h-full object-cover"
                  showProgressUi={false}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Library className="w-10 h-10 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-primary/10 backdrop-blur-md flex items-center justify-center">
                <Library className="w-16 h-16 text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{library.name}</h1>

            <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
              <StatusBadge status="unread" icon={Library}>
                {seriesLabel}
              </StatusBadge>

              <RefreshButton libraryId={library.id} />
              <ScanButton libraryId={library.id} />
            </div>

            {library.unavailable && <p className="text-sm text-destructive mt-2">Bibliotheque indisponible</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
