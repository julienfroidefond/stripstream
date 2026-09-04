import { Library } from "lucide-react";
import type { NormalizedLibrary, NormalizedSeries } from "@/lib/providers/types";
import { RefreshButton } from "./RefreshButton";
import { ScanButton } from "./ScanButton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeriesCover } from "@/components/ui/series-cover";

interface LibraryHeaderProps {
  library: NormalizedLibrary;
  seriesCount: number;
  series: NormalizedSeries[];
}

const getHeaderSeries = (series: NormalizedSeries[]) => {
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
    <div className="relative min-h-[220px] md:h-[220px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden border-y border-border/60">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/65 to-background/85" />
        {background ? (
          <SeriesCover
            series={background}
            alt=""
            className="scale-105 blur-sm brightness-50"
            showProgressUi={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}
      </div>

      <div className="relative container mx-auto h-full px-4 py-8">
        <div className="flex h-full flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative h-[120px] w-[120px] flex-shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-lg">
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

          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">{library.name}</h1>

            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border/60 bg-background/45 p-2 backdrop-blur-sm md:justify-start">
              <StatusBadge status="unread" icon={Library}>
                {seriesLabel}
              </StatusBadge>

              <RefreshButton libraryId={library.id} />
              <ScanButton libraryId={library.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
)
