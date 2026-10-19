"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { NormalizedBook, NormalizedSeriesRating } from "@/lib/providers/types";
import { useRouter } from "next/navigation";

// Chargement différé du lecteur lourd (uniquement quand on ouvre le reader).
const BookReader = dynamic(() => import("./BookReader").then((m) => m.BookReader), {
  ssr: false,
  loading: () => null,
});
import type { ReaderInfo } from "./types";

interface ClientBookWrapperProps {
  book: NormalizedBook;
  pages: number[];
  nextBook: NormalizedBook | null;
  readerInfo?: ReaderInfo | null;
  seriesRating?: NormalizedSeriesRating | null;
  onRefresh?: () => Promise<void>;
}

export function ClientBookWrapper({ book, pages, nextBook, readerInfo, seriesRating, onRefresh }: ClientBookWrapperProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseReader = (_currentPage: number) => {
    setIsClosing(true);
    router.back();
  };

  if (isClosing) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fermeture du lecteur...</span>
        </div>
      </div>
    );
  }

  return (
    <BookReader
      book={book}
      pages={pages}
      readerInfo={readerInfo}
      seriesRating={seriesRating}
      onClose={handleCloseReader}
      onRefresh={onRefresh}
      nextBook={nextBook}
    />
  );
}
