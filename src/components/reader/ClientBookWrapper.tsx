"use client";

import type { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { useRouter } from "next/navigation";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";

interface ClientBookWrapperProps {
  book: KomgaBook;
  pages: number[];
  nextBook: KomgaBook | null;
}

export function ClientBookWrapper({ book, pages, nextBook }: ClientBookWrapperProps) {
  const router = useRouter();

  const handleCloseReader = (currentPage: number) => {
    fetch(`/api/komga/cache/clear/${book.libraryId}/${book.seriesId}`, {
      method: "POST",
    });
    ClientOfflineBookService.setCurrentPage(book, currentPage);
    router.push(`/series/${book.seriesId}`);
    //router.back();
  };

  return <BookReader book={book} pages={pages} onClose={handleCloseReader} nextBook={nextBook} />;
}
