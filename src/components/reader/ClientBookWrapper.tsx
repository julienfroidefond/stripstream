"use client";

import { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { useRouter } from "next/navigation";

interface ClientBookWrapperProps {
  book: KomgaBook;
  pages: number[];
}

export function ClientBookWrapper({ book, pages }: ClientBookWrapperProps) {
  const router = useRouter();

  const handleCloseReader = () => {
    fetch(`/api/komga/cache/clear/${book.libraryId}/${book.seriesId}`, {
      method: "POST",
    });
    router.back();
  };

  return <BookReader book={book} pages={pages} onClose={handleCloseReader} />;
}
