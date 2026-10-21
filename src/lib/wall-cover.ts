import type { NormalizedSeries } from "@/lib/providers/types";
import type { WallItem } from "@/types/wall";

/**
 * Série minimale attendue par `SeriesCover` : le mur ne transporte que ces
 * champs, on les remet dans la forme attendue par la couverture.
 */
export function wallItemToSeries(item: WallItem): NormalizedSeries {
  return {
    id: item.id,
    name: item.name,
    bookCount: item.bookCount,
    booksReadCount: item.booksReadCount,
    thumbnailUrl: item.thumbnailUrl,
    summary: item.summary,
    authors: item.authors.map((name) => ({ name, role: "" })),
    genres: item.genres,
    tags: [],
    startYear: item.startYear,
    missingCount: item.missingCount,
    seriesStatus: item.seriesStatus,
    communityScore: item.communityScore,
  };
}
