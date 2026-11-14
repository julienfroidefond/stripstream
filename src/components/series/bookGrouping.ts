import { isSpecialBook } from "@/lib/books/volume-type";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";

/**
 * Splits a series' books into the regular volumes and the side content shown
 * in its own section beneath them.
 */
export function splitBooksByVolumeType(books: NormalizedBook[]): {
  regularBooks: NormalizedBook[];
  specialBooks: NormalizedBook[];
} {
  const regularBooks: NormalizedBook[] = [];
  const specialBooks: NormalizedBook[] = [];

  for (const book of books) {
    if (isSpecialBook(book)) {
      specialBooks.push(book);
    } else {
      regularBooks.push(book);
    }
  }

  return { regularBooks, specialBooks };
}

/**
 * One entry of a series' book list: either a real book or the placeholder of a
 * volume the backend reports as missing. The discriminant replaces the former
 * `volumeType: "_missing"` fake books, so a placeholder can never reach a code
 * path that expects a readable book (actions, navigation, progress).
 */
export type DisplayBook =
  | { kind: "book"; key: string; book: NormalizedBook }
  | {
      kind: "missing";
      key: string;
      title: string;
      volume: number;
      coverUrl: string | null;
    };

/** Wraps real books as display entries, in their original order. */
export function toDisplayBooks(books: NormalizedBook[]): DisplayBook[] {
  return books.map((book) => ({ kind: "book", key: book.id, book }));
}

function displayVolume(entry: DisplayBook): number | null {
  return entry.kind === "missing" ? entry.volume : (entry.book.volume ?? null);
}

/** Volume order; entries without a volume number go last. */
function compareByVolume(a: DisplayBook, b: DisplayBook): number {
  const va = displayVolume(a);
  const vb = displayVolume(b);
  if (va === vb) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  return va - vb;
}

/**
 * Interleaves the missing-volume placeholders with the regular books, ordered
 * by volume number. Books without a volume number go last; the sort is stable,
 * so books sharing a volume keep the provider's order and a real book precedes
 * the placeholder of the same number.
 */
export function mergeMissingBooks(
  books: NormalizedBook[],
  missing: NormalizedMissingBook[]
): DisplayBook[] {
  const entries = toDisplayBooks(books);
  if (missing.length === 0) return entries;

  const placeholders: DisplayBook[] = missing.map((item) => ({
    kind: "missing",
    key: `missing-${item.volumeNumber}`,
    title: item.title,
    volume: item.volumeNumber,
    coverUrl: item.coverUrl,
  }));

  return [...entries, ...placeholders].sort(compareByVolume);
}
