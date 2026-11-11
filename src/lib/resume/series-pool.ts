import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { indexSeries, matchSeries, seriesKey, type SeriesIndex } from "./identity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrouve une série par l'identifiant porté par le tome, ou par son nom.
 *
 * Stripstream n'expose que le nom de la série dans les listes de tomes : on
 * passe alors par la recherche de la bibliothèque du tome. Les identifiants
 * UUID (Komga, premier tome Stripstream) sont résolus directement.
 */
async function resolveSeries(
  provider: IMediaProvider,
  book: NormalizedBook,
  target: string
): Promise<NormalizedSeries | null> {
  if (UUID_RE.test(target)) {
    return provider.getSeriesById(target).catch(() => null);
  }

  if (book.libraryId) {
    try {
      const page = await provider.getSeries(
        book.libraryId,
        undefined,
        20,
        false,
        target
      );
      const match = matchSeries(target, book.libraryId, indexSeries(page.items));
      if (match) return match;
    } catch {
      // Repli sur la résolution par identifiant ci-dessous.
    }
  }

  return provider.getSeriesById(target).catch(() => null);
}

/**
 * Clé de déduplication des résolutions. Deux homonymes de bibliothèques
 * différentes sont deux séries distinctes ; un identifiant reste unique quelle
 * que soit la casse.
 */
function missingKey(target: string, libraryId: string): string {
  if (UUID_RE.test(target)) return `id:${seriesKey(target)}`;
  return `name:${seriesKey(target)}@${libraryId}`;
}

/**
 * Vrai si le pool contient déjà la série du tome.
 *
 * Un homonyme d'une autre bibliothèque ne suffit pas : on tentera de résoudre
 * la série de la bibliothèque du tome, puis on retombera sur cet homonyme si
 * la résolution échoue (comportement de `matchSeries`).
 */
function isCoveredByPool(
  pool: readonly NormalizedSeries[],
  index: SeriesIndex,
  target: string,
  libraryId: string
): boolean {
  if (UUID_RE.test(target)) {
    return pool.some(
      (series) => series.id.toLowerCase() === target.toLowerCase()
    );
  }

  const matched = matchSeries(target, libraryId, index);
  if (!matched) return false;
  if (matched.libraryId && matched.libraryId !== libraryId) return false;
  return true;
}

/**
 * Complète un pool de séries avec celles référencées par `books`.
 *
 * Le hero « Reprendre la lecture » ne reçoit que `seriesId` avec chaque tome :
 * le nom de la série, le résumé, les genres et les auteurs viennent du pool.
 * Les listes bornées (`getHomeOngoingSeries`) ne couvrent pas forcément les
 * tomes chargés par « Voir plus » ; on résout donc uniquement les séries
 * manquantes, en réutilisant celles déjà connues.
 */
export async function resolveSeriesPool(
  provider: IMediaProvider,
  books: readonly NormalizedBook[],
  known: readonly NormalizedSeries[] = []
): Promise<NormalizedSeries[]> {
  const pool = [...known];
  const seen = new Set(pool.map((series) => series.id));
  const index = indexSeries(pool);
  const missing = new Map<string, { target: string; book: NormalizedBook }>();

  for (const book of books) {
    const target = book.seriesId?.trim();
    if (!target) continue;

    const key = missingKey(target, book.libraryId);
    if (isCoveredByPool(pool, index, target, book.libraryId) || missing.has(key)) {
      continue;
    }
    missing.set(key, { target, book });
  }

  if (missing.size === 0) return pool;

  const resolved = await Promise.all(
    Array.from(missing.values(), ({ target, book }) =>
      resolveSeries(provider, book, target)
    )
  );

  for (const series of resolved) {
    if (!series || seen.has(series.id)) continue;
    seen.add(series.id);
    pool.push(series);
  }

  return pool;
}
