import type { NormalizedSeries } from "@/lib/providers/types";
import { normalizeSeriesSearch } from "@/lib/services/read-series.service";

export interface SeriesIndex {
  byId: Map<string, NormalizedSeries>;
  byName: Map<string, NormalizedSeries[]>;
}

/** Clé de comparaison des titres : casse et accents ignorés. */
export function seriesKey(value: string): string {
  return normalizeSeriesSearch(value.trim());
}

/** Indexe un pool de séries par identifiant et par titre normalisé. */
export function indexSeries(series: readonly NormalizedSeries[]): SeriesIndex {
  const byId = new Map<string, NormalizedSeries>();
  const byName = new Map<string, NormalizedSeries[]>();

  for (const item of series) {
    byId.set(item.id, item);
    const key = seriesKey(item.name);
    const bucket = byName.get(key);
    if (bucket) bucket.push(item);
    else byName.set(key, [item]);
  }

  return { byId, byName };
}

/**
 * Règle unique de correspondance tome → série.
 *
 * `seriesId` peut être un identifiant ou, pour Stripstream, le nom de la série
 * quand la liste de tomes ne fournit pas `series_id`. La bibliothèque départage
 * les homonymes : un candidat sans bibliothèque reste préférable à un homonyme
 * connu d'une autre bibliothèque, puis on retombe sur le premier candidat.
 */
export function matchSeries(
  target: string | null | undefined,
  libraryId: string | null | undefined,
  index: SeriesIndex
): NormalizedSeries | null {
  const value = target?.trim();
  if (!value) return null;

  const byId = index.byId.get(value);
  if (byId) return byId;

  const candidates = index.byName.get(seriesKey(value));
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const sameLibrary = candidates.find(
    (item) => item.libraryId && libraryId && item.libraryId === libraryId
  );
  if (sameLibrary) return sameLibrary;

  const unknownLibrary = candidates.find(
    (item) => !item.libraryId || !libraryId
  );
  return unknownLibrary ?? candidates[0];
}
