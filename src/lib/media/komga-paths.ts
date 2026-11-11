/**
 * The app speaks 1-based page numbers; Komga's `zero_based=true` API expects
 * 0-based ones. Keep the conversion in one place for pages and thumbnails.
 */
export function komgaPagePath(bookId: string, pageNumber: number): string {
  return `books/${bookId}/pages/${pageNumber - 1}?zero_based=true`;
}

export function komgaPageThumbnailPath(bookId: string, pageNumber: number): string {
  return `books/${bookId}/pages/${pageNumber - 1}/thumbnail?zero_based=true`;
}
