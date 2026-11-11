export const BOOK_PAGE_TOKEN = "{page}";

/**
 * Fills a provider-owned media template with a 1-based page number.
 *
 * The token lives in the adapter's URL template, so the reader never has to
 * infer a provider route from `thumbnailUrl`.
 */
export function resolveBookMediaUrl(template: string, pageNumber: number): string {
  return template.replaceAll(BOOK_PAGE_TOKEN, String(pageNumber));
}
