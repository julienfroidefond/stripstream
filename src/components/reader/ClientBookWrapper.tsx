"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
  const [isClosing, setIsClosing] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);

  useEffect(() => {
    if (!isClosing || !targetPath) return;
    router.push(targetPath);
  }, [isClosing, targetPath, router]);

  const handleCloseReader = (currentPage: number) => {
    ClientOfflineBookService.setCurrentPage(book, currentPage);
    setTargetPath(`/series/${book.seriesId}`);
    setIsClosing(true);
  };

  if (isClosing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fermeture du lecteur...</span>
        </div>
      </div>
    );
  }

  return (
    <PhotoswipeReader book={book} pages={pages} onClose={handleCloseReader} nextBook={nextBook} />
  );
}
