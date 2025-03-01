import { KomgaBook } from "@/types/komga";

export class ClientOfflineBookService {
  static setCurrentPage(book: KomgaBook, page: number) {
    localStorage.setItem(`${book.id}-page`, page.toString());
  }

  static getCurrentPage(book: KomgaBook) {
    const readProgressPage = book.readProgress?.page || 0;
    if (typeof localStorage !== "undefined") {
      const cPageLS = localStorage.getItem(`${book.id}-page`) || "0";
      const currentPage = parseInt(cPageLS);

      if (currentPage < readProgressPage) {
        return readProgressPage;
      }

      return currentPage;
    } else {
      return readProgressPage;
    }
  }

  static removeCurrentPage(book: KomgaBook) {
    localStorage.removeItem(`${book.id}-page`);
  }

  static removeCurrentPageById(bookId: string) {
    localStorage.removeItem(`${bookId}-page`);
  }
}
