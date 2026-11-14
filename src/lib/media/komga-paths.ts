/**
 * The app speaks 1-based page numbers, and so does Komga by default: both
 * `pages/{n}` and `pages/{n}/thumbnail` are 1-based. Only the page endpoint
 * accepts `zero_based=true`, which is why the two used to drift apart; keep
 * both paths here, without conversion.
 */
export function komgaPagePath(bookId: string, pageNumber: number): string {
  return `books/${bookId}/pages/${pageNumber}`;
}

export function komgaPageThumbnailPath(bookId: string, pageNumber: number): string {
  return `books/${bookId}/pages/${pageNumber}/thumbnail`;
}
