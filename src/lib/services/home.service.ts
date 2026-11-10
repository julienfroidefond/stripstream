import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isSameSeries(series: NormalizedSeries, target: string): boolean {
  return (
    series.id === target ||
    series.name === target ||
    normalize(series.name) === normalize(target)
  );
}

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
      const match = page.items.find((series) => isSameSeries(series, target));
      if (match) return match;
    } catch {
      // Repli sur la résolution par identifiant ci-dessous.
    }
  }

  return provider.getSeriesById(target).catch(() => null);
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
  books: NormalizedBook[],
  known: NormalizedSeries[] = []
): Promise<NormalizedSeries[]> {
  const pool = [...known];
  const seen = new Set(pool.map((series) => series.id));
  const missing = new Map<string, { target: string; book: NormalizedBook }>();

  for (const book of books) {
    const target = book.seriesId?.trim();
    if (!target) continue;

    const key = normalize(target);
    if (
      pool.some((series) => isSameSeries(series, target)) ||
      missing.has(key)
    ) {
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
