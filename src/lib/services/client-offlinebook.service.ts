import type { NormalizedBook } from "@/lib/providers/types";

// Les progressions locales sont scopées par origine du serveur (extraite de
// `thumbnailUrl`) pour éviter qu'un même `book.id` partagé entre deux comptes
// (deux Komga différents par ex.) n'écrase la progression de l'un par l'autre.
const PAGE_KEY_SUFFIX = "::page";
const LEGACY_PAGE_KEY_SUFFIX = "-page";

function getOrigin(book: NormalizedBook): string | null {
  if (!book.thumbnailUrl) return null;
  try {
    return new URL(book.thumbnailUrl).origin;
  } catch {
    return null;
  }
}

function buildKey(origin: string, bookId: string): string {
  return `${origin}::${bookId}${PAGE_KEY_SUFFIX}`;
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export class ClientOfflineBookService {
  static setCurrentPage(book: NormalizedBook, page: number) {
    if (!hasLocalStorage()) return;
    const origin = getOrigin(book);
    if (!origin) return;
    try {
      localStorage.setItem(buildKey(origin, book.id), page.toString());
    } catch {
      // Ignore localStorage errors (quota, SSR, private mode)
    }
  }

  static getCurrentPage(book: NormalizedBook): number {
    const readProgressPage = book.readProgress?.page || 0;
    if (!hasLocalStorage()) return readProgressPage;
    const origin = getOrigin(book);
    if (!origin) return readProgressPage;
    try {
      const stored = localStorage.getItem(buildKey(origin, book.id));
      if (!stored) return readProgressPage;
      const currentPage = parseInt(stored, 10);
      if (Number.isNaN(currentPage)) return readProgressPage;
      // La valeur serveur peut être plus à jour si la sync a transité par un autre device
      return currentPage < readProgressPage ? readProgressPage : currentPage;
    } catch {
      return readProgressPage;
    }
  }

  static removeCurrentPage(book: NormalizedBook) {
    if (!hasLocalStorage()) return;
    const origin = getOrigin(book);
    try {
      if (origin) localStorage.removeItem(buildKey(origin, book.id));
      // Nettoyage de l'ancienne clé non scopée si elle traîne
      localStorage.removeItem(`${book.id}${LEGACY_PAGE_KEY_SUFFIX}`);
    } catch {
      // ignore
    }
  }

  /**
   * Quand on n'a que le bookId (boutons "marquer comme lu/non lu"), on ne peut
   * pas connaître l'origine ; on retire alors toutes les entrées qui matchent
   * ce bookId, peu importe l'origine. Inclut l'ancienne clé non scopée.
   */
  static removeCurrentPageById(bookId: string) {
    if (!hasLocalStorage()) return;
    try {
      const scopedSuffix = `::${bookId}${PAGE_KEY_SUFFIX}`;
      const legacyKey = `${bookId}${LEGACY_PAGE_KEY_SUFFIX}`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === legacyKey || key.endsWith(scopedSuffix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
