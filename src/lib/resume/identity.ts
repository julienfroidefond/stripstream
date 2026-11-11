import type {
  NormalizedBook,
  NormalizedSeries,
  SeriesRef,
} from "@/lib/providers/types";
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
 * Référence de série portée par un tome.
 *
 * Les deux champs restent séparés : `id` ne contient jamais un titre, même
 * quand l'API ne fournit que le nom. Les appelants qui n'ont que des champs de
 * tome passent par ce helper plutôt que de reconstruire la paire à la main.
 */
export function bookSeriesRef(
  book: Pick<NormalizedBook, "seriesId" | "seriesName">
): SeriesRef {
  return { id: book.seriesId, name: book.seriesName };
}

/**
 * Règle unique de correspondance tome → série.
 *
 * L'identifiant provider est autoritaire : quand il est présent, on le cherche
 * d'abord. Le titre normalisé ne sert que de repli pour les endpoints qui
 * omettent l'id. La bibliothèque départage les homonymes : un candidat sans
 * bibliothèque reste préférable à un homonyme connu d'une autre bibliothèque,
 * puis on retombe sur le premier candidat.
 */
export function matchSeries(
  ref: SeriesRef | null | undefined,
  libraryId: string | null | undefined,
  index: SeriesIndex
): NormalizedSeries | null {
  const id = ref?.id?.trim();
  if (id) {
    const byId = index.byId.get(id);
    if (byId) return byId;
  }

  const name = ref?.name?.trim();
  if (!name) return null;

  const candidates = index.byName.get(seriesKey(name));
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
