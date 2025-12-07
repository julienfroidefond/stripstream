"use client";

import type { KomgaBook } from "@/types/komga";
import { PhotoswipeReader } from "./PhotoswipeReader";
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
    ClientOfflineBookService.setCurrentPage(book, currentPage);
    router.push(`/series/${book.seriesId}`);
  };

  return (
    <PhotoswipeReader book={book} pages={pages} onClose={handleCloseReader} nextBook={nextBook} />
  );
}
