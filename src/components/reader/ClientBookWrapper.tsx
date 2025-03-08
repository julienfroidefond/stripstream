"use client";

import type { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { useRouter } from "next/navigation";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { EpubReader } from "./EpubReader";

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

  if (book.media.mediaProfile === "EPUB") {
    return <EpubReader book={book} onClose={handleCloseReader} nextBook={nextBook} />;
  }

  return <BookReader book={book} pages={pages} onClose={handleCloseReader} nextBook={nextBook} />;
}
