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
 * Un échec retire l'override (rollback). Un succès le marque `settled` : il
 * reste appliqué tant que le serveur (cache en retard compris) renvoie l'état
 * observé, puis il est *retiré* dès que le serveur a montré un autre état.
 * Sans ce retrait, l'override se rallumerait le jour où le serveur revient à
 * l'état observé (relire le tome jusqu'au bout, « tout marquer lu »).
 */

export interface ReadOverride {
  /** Valeur visée par le marquage. */
  read: boolean;
  /** Signature de l'état serveur au moment du marquage. */
  observed: string;
  /** Le serveur a enregistré le marquage ; l'override n'attend plus que le rafraîchissement. */
  settled?: boolean;
}

export type ReadOverrides = ReadonlyMap<string, ReadOverride>;

/**
 * Ids dont l'override réglé a été dépassé par le serveur. Ensemble mutable
 * tenu par le fournisseur : il ne fait que grandir entre deux marquages d'un
 * même id (un nouveau marquage l'en retire), d'où une lecture idempotente.
 */
export type RetiredOverrides = Set<string>;

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
  retired: RetiredOverrides,
  id: string,
  signature: string
): ReadOverride | null {
  const override = overrides.get(id);
  if (!override || retired.has(id)) return null;
  if (override.observed !== signature) {
    // Le serveur a rattrapé (ou dépassé) un marquage enregistré : il fait foi
    // définitivement pour cet override.
    if (override.settled) retired.add(id);
    return null;
  }
  return override;
}

/** Le livre tel qu'il doit être affiché, override optimiste compris. */
export function resolveBook(
  overrides: ReadOverrides,
  book: NormalizedBook,
  retired: RetiredOverrides = new Set()
): NormalizedBook {
  const override = activeOverride(overrides, retired, book.id, bookProgressSignature(book));
  if (!override) return book;
  return { ...book, readProgress: optimisticBookProgress(book, override.read) };
}

/** La série telle qu'elle doit être affichée, override optimiste compris. */
export function resolveSeries(
  overrides: ReadOverrides,
  series: NormalizedSeries,
  retired: RetiredOverrides = new Set()
): NormalizedSeries {
  const override = activeOverride(
    overrides,
    retired,
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

/** Copie de `overrides` où l'override de `id` est marqué enregistré. */
export function settleOverride(overrides: ReadOverrides, id: string): ReadOverrides {
  const override = overrides.get(id);
  if (!override || override.settled) return overrides;
  return withOverride(overrides, id, { ...override, settled: true });
}

/**
 * Vide `retired` et renvoie les ids qu'il contenait. Le fournisseur l'appelle
 * au marquage suivant, *hors* d'un updater d'état (qui peut être rejoué),
 * puis retire ces ids de la table avec `withoutIds`.
 */
export function takeRetired(retired: RetiredOverrides): string[] {
  const ids = [...retired];
  retired.clear();
  return ids;
}

/** Copie de `overrides` sans `ids` ; même instance si aucun n'y figure. */
export function withoutIds(overrides: ReadOverrides, ids: readonly string[]): ReadOverrides {
  if (!ids.some((id) => overrides.has(id))) return overrides;
  const next = new Map(overrides);
  for (const id of ids) next.delete(id);
  return next;
}
