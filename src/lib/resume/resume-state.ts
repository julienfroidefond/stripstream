import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { indexSeries, matchSeries } from "./identity";

/** Flux bruts qui alimentent la reprise de lecture. */
export interface ResumeSource {
  ongoingBooks?: readonly NormalizedBook[] | null;
  onDeck?: readonly NormalizedBook[] | null;
}

/** Entrée de reprise prête à afficher : le hero n'a plus rien à recalculer. */
export interface ResumeEntry {
  book: NormalizedBook;
  /** Série qui porte le tome, `null` quand le pool ne la contient pas. */
  series: NormalizedSeries | null;
  /** Avancement du tome, `null` sans pagination exploitable. */
  progressPercent: number | null;
}

/**
 * Fusionne « à suivre » et « en cours » : `onDeck` d'abord (prochain tome non
 * lu), puis les tomes commencés, sans doublon d'identifiant.
 */
export function mergeResumeBooks(source: ResumeSource): NormalizedBook[] {
  const items = [...(source.onDeck ?? []), ...(source.ongoingBooks ?? [])];
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Avancement du tome en cours, en pourcentage. Retourne `null` quand le tome
 * n'a pas de pagination exploitable (le pourcentage de série prend le relais).
 */
export function getBookProgressPercent(
  book: NormalizedBook | null
): number | null {
  const page = book?.readProgress?.page ?? 0;
  const total = book?.pageCount ?? 0;
  if (page <= 0 || total <= 0) return null;
  return Math.min(100, Math.round((page / total) * 100));
}

/** Avancement d'une série, borné entre 0 et 100. */
export function getSeriesProgressPercent(series: NormalizedSeries): number {
  const bookCount = Math.max(0, series.bookCount);
  const booksReadCount = Math.max(0, series.booksReadCount);
  if (bookCount <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((booksReadCount / bookCount) * 100))
  );
}

/**
 * Transforme des tomes en entrées de reprise.
 *
 * La série est retrouvée dans le pool avec la règle d'identité unique ; un
 * tome sans série reste dans la liste avec `series: null`, à charge de
 * l'écran de décider s'il peut l'afficher.
 */
export function buildResumeEntries(
  books: readonly NormalizedBook[],
  seriesPool: readonly NormalizedSeries[]
): ResumeEntry[] {
  const index = indexSeries(seriesPool);
  return books.map((book) => ({
    book,
    series: matchSeries(book.seriesId, book.libraryId, index),
    progressPercent: getBookProgressPercent(book),
  }));
}
