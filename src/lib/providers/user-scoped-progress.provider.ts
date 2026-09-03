import type { IMediaProvider } from "./provider.interface";
import type { NormalizedBook, NormalizedBooksPage } from "./types";

/**
 * Namespaces browser-only reading position by authenticated app user. Reading
 * state itself remains owned by the configured provider (Stripstream/Komga),
 * which is also what powers the home continuation sections.
 */
export function withUserScopedProgress(provider: IMediaProvider, userId: number): IMediaProvider {
  const scopeBook = (book: NormalizedBook): NormalizedBook => ({ ...book, readProgressScope: String(userId) });

  return new Proxy(provider, {
    get(target, property, receiver) {
      if (property === "getBooks") {
        return async (...args: Parameters<IMediaProvider["getBooks"]>): Promise<NormalizedBooksPage> => {
          const page = await target.getBooks(...args);
          return { ...page, items: page.items.map(scopeBook) };
        };
      }
      if (property === "getBook") {
        return async (...args: Parameters<IMediaProvider["getBook"]>) => scopeBook(await target.getBook(...args));
      }
      if (property === "getNextBook") {
        return async (...args: Parameters<IMediaProvider["getNextBook"]>) => {
          const book = await target.getNextBook(...args);
          return book ? scopeBook(book) : null;
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
