import type { NormalizedBook } from "@/lib/providers/types";

/**
 * `volumeType` values that stay with the regular volumes of a series.
 *
 * The Stripstream Librarian classifies every book as `regular`, `hs`,
 * `oneshot` or `integral` (`infra/migrations/0087_add_integral_volume_type.sql`).
 * An `integral` is a collected edition of the *same* series (volumes 1-3 bound
 * together), so it belongs in the main list, not in the "Hors-série" section
 * below it — only genuine side content (`hs`, `oneshot`) is split out.
 */
const REGULAR_VOLUME_TYPES = new Set(["regular", "integral"]);

/** True when a book should be shown in the separate "Hors-série" section. */
export function isSpecialBook(book: NormalizedBook): boolean {
  return book.volumeType != null && !REGULAR_VOLUME_TYPES.has(book.volumeType);
}
