import type { KomgaBook } from "@/types/komga";

export class ClientOfflineBookService {
  static setCurrentPage(book: KomgaBook, page: number) {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.setItem) {
      try {
        localStorage.setItem(`${book.id}-page`, page.toString());
      } catch {
        // Ignore localStorage errors in SSR
      }
    }
  }

  static getCurrentPage(book: KomgaBook) {
    const readProgressPage = book.readProgress?.page || 0;
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.getItem) {
      try {
        const cPageLS = localStorage.getItem(`${book.id}-page`) || "0";
        const currentPage = parseInt(cPageLS);

        if (currentPage < readProgressPage) {
          return readProgressPage;
        }

        return currentPage;
      } catch {
        return readProgressPage;
      }
    } else {
      return readProgressPage;
    }
  }

  static removeCurrentPage(book: KomgaBook) {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.removeItem) {
      try {
        localStorage.removeItem(`${book.id}-page`);
      } catch {
        // Ignore localStorage errors in SSR
      }
    }
  }

  static removeCurrentPageById(bookId: string) {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage.removeItem) {
      try {
        localStorage.removeItem(`${bookId}-page`);
      } catch {
        // Ignore localStorage errors in SSR
      }
    }
  }
}
