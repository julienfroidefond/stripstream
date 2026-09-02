import type { IMediaProvider } from "./provider.interface";
import type { NormalizedBook, NormalizedBooksPage } from "./types";
import { ReadProgressService } from "@/lib/services/read-progress.service";

/**
 * Keeps catalogue access with the configured provider while making the reading
 * state belong to the authenticated Stripstream user.
 */
export function withUserScopedProgress(provider: IMediaProvider, userId: number): IMediaProvider {
  const scopeBook = (book: NormalizedBook): NormalizedBook => ({ ...book, readProgressScope: String(userId) });
  const hydrateBook = async (book: NormalizedBook): Promise<NormalizedBook> =>
    scopeBook((await ReadProgressService.getForBooks(userId, [book]))[0]);

  return new Proxy(provider, {
    get(target, property, receiver) {
      if (property === "getBooks") {
        return async (...args: Parameters<IMediaProvider["getBooks"]>): Promise<NormalizedBooksPage> => {
          const page = await target.getBooks(...args);
          const items = await ReadProgressService.getForBooks(userId, page.items);
          return { ...page, items: items.map(scopeBook) };
        };
      }
      if (property === "getBook") {
        return async (...args: Parameters<IMediaProvider["getBook"]>) => hydrateBook(await target.getBook(...args));
      }
      if (property === "getNextBook") {
        return async (...args: Parameters<IMediaProvider["getNextBook"]>) => {
          const book = await target.getNextBook(...args);
          return book ? hydrateBook(book) : null;
        };
      }
      if (property === "getReadProgress") {
        return (bookId: string) => ReadProgressService.get(userId, bookId);
      }
      if (property === "saveReadProgress") {
        return (bookId: string, page: number | null, completed: boolean) =>
          ReadProgressService.save(userId, bookId, page, completed);
      }
      if (property === "resetReadProgress") {
        return (bookId: string) => ReadProgressService.remove(userId, bookId);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
