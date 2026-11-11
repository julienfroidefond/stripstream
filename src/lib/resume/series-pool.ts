import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type {
  NormalizedBook,
  NormalizedSeries,
  SeriesRef,
} from "@/lib/providers/types";
import {
  bookSeriesRef,
  indexSeries,
  matchSeries,
  seriesKey,
  type SeriesIndex,
} from "./identity";

/**
 * Retrouve la série d'un tome.
 *
 * L'id provider est autoritaire : quand il est présent, on ne consulte jamais
 * le nom. Le nom ne sert qu'aux endpoints qui omettent `series_id` : on cherche
 * alors dans la bibliothèque du tome et on applique la même règle d'identité.
 *
 * Les erreurs provider remontent : les appelants décident s'ils peuvent
 * continuer sans la série (le pool de reprise, lui, ignore l'échec).
 */
export async function resolveBookSeries(
  provider: IMediaProvider,
  book: Pick<NormalizedBook, "seriesId" | "seriesName" | "libraryId">
): Promise<NormalizedSeries | null> {
  const id = book.seriesId?.trim();
  if (id) {
    return provider.getSeriesById(id);
  }

  const name = book.seriesName?.trim();
  if (!name || !book.libraryId) return null;

  const page = await provider.getSeries(
    book.libraryId,
    undefined,
    20,
    false,
    name
  );
  return matchSeries({ id: null, name }, book.libraryId, indexSeries(page.items));
}

/**
 * Clé de déduplication des résolutions. Deux homonymes de bibliothèques
 * différentes sont deux séries distinctes ; un identifiant reste unique quelle
 * que soit la casse.
 */
function missingKey(ref: SeriesRef, libraryId: string): string | null {
  const id = ref.id?.trim();
  if (id) return `id:${seriesKey(id)}`;

  const name = ref.name?.trim();
  if (!name) return null;
  return `name:${seriesKey(name)}@${libraryId}`;
}

/**
 * Vrai si le pool contient déjà la série du tome.
 *
 * Un id présent mais absent du pool force une résolution par id : un homonyme
 * du pool n'est pas une preuve suffisante. Pour une référence sans id, on
 * applique la règle de `matchSeries` puis on refuse un homonyme d'une autre
 * bibliothèque, afin de tenter la résolution dans la bibliothèque du tome.
 */
function isCoveredByPool(
  pool: readonly NormalizedSeries[],
  index: SeriesIndex,
  ref: SeriesRef,
  libraryId: string
): boolean {
  const id = ref.id?.trim();
  if (id) {
    return pool.some(
      (series) => series.id.toLowerCase() === id.toLowerCase()
    );
  }

  const matched = matchSeries(ref, libraryId, index);
  if (!matched) return false;
  if (matched.libraryId && matched.libraryId !== libraryId) return false;
  return true;
}

/**
 * Complète un pool de séries avec celles référencées par `books`.
 *
 * Le hero « Reprendre la lecture » ne reçoit que la référence de série avec
 * chaque tome : le nom de la série, le résumé, les genres et les auteurs
 * viennent du pool. Les listes bornées (`getHomeOngoingSeries`) ne couvrent pas
 * forcément les tomes chargés par « Voir plus » ; on résout donc uniquement les
 * séries manquantes, en réutilisant celles déjà connues.
 */
export async function resolveSeriesPool(
  provider: IMediaProvider,
  books: readonly NormalizedBook[],
  known: readonly NormalizedSeries[] = []
): Promise<NormalizedSeries[]> {
  const pool = [...known];
  const seen = new Set(pool.map((series) => series.id));
  const index = indexSeries(pool);
  const missing = new Map<string, NormalizedBook>();

  for (const book of books) {
    const ref = bookSeriesRef(book);
    const key = missingKey(ref, book.libraryId);
    if (!key) continue;

    if (
      isCoveredByPool(pool, index, ref, book.libraryId) ||
      missing.has(key)
    ) {
      continue;
    }
    missing.set(key, book);
  }

  if (missing.size === 0) return pool;

  const resolved = await Promise.all(
    Array.from(missing.values(), (book) =>
      resolveBookSeries(provider, book).catch(() => null)
    )
  );

  for (const series of resolved) {
    if (!series || seen.has(series.id)) continue;
    seen.add(series.id);
    pool.push(series);
  }

  return pool;
}
