import type {
  NormalizedBook,
  NormalizedReadProgress,
  NormalizedSeries,
} from "@/lib/providers/types";

/**
 * Politique optimiste de la progression de lecture, sans React.
 *
 * Un marquage lu/non lu pose un override qui mémorise l'état serveur observé
 * au moment du clic. L'override s'applique tant que le serveur renvoie encore
 * cet état ; dès que le `router.refresh()` livre une valeur différente, le
 * serveur reprend la main sans que la surface ait à nettoyer quoi que ce soit.
 * Un échec retire l'override (rollback).
 */

export interface ReadOverride {
  /** Valeur visée par le marquage. */
  read: boolean;
  /** Signature de l'état serveur au moment du marquage. */
  observed: string;
}

export type ReadOverrides = ReadonlyMap<string, ReadOverride>;

/** Identité de l'état de lecture serveur d'un livre. */
export function bookProgressSignature(book: NormalizedBook): string {
  const progress = book.readProgress;
  if (!progress) return "none";
  return `${progress.completed ? "done" : "open"}:${progress.page}`;
}

/** Identité de l'état de lecture serveur d'une série. */
export function seriesProgressSignature(series: NormalizedSeries): string {
  return `${series.booksReadCount}/${series.bookCount}`;
}

/** Progression qu'un livre aura une fois le marquage enregistré. */
export function optimisticBookProgress(
  book: NormalizedBook,
  read: boolean
): NormalizedReadProgress | null {
  if (!read) return null;
  return {
    page: book.pageCount,
    completed: true,
    lastReadAt: book.readProgress?.lastReadAt ?? null,
  };
}

function activeOverride(
  overrides: ReadOverrides,
  id: string,
  signature: string
): ReadOverride | null {
  const override = overrides.get(id);
  if (!override || override.observed !== signature) return null;
  return override;
}

/** Le livre tel qu'il doit être affiché, override optimiste compris. */
export function resolveBook(
  overrides: ReadOverrides,
  book: NormalizedBook
): NormalizedBook {
  const override = activeOverride(overrides, book.id, bookProgressSignature(book));
  if (!override) return book;
  return { ...book, readProgress: optimisticBookProgress(book, override.read) };
}

/** La série telle qu'elle doit être affichée, override optimiste compris. */
export function resolveSeries(
  overrides: ReadOverrides,
  series: NormalizedSeries
): NormalizedSeries {
  const override = activeOverride(
    overrides,
    series.id,
    seriesProgressSignature(series)
  );
  if (!override) return series;
  return { ...series, booksReadCount: override.read ? series.bookCount : 0 };
}

/** Copie de `overrides` avec `id` posé (ou retiré si `value` est `null`). */
export function withOverride(
  overrides: ReadOverrides,
  id: string,
  value: ReadOverride | null
): Map<string, ReadOverride> {
  const next = new Map(overrides);
  if (value) next.set(id, value);
  else next.delete(id);
  return next;
}
