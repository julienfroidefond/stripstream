"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { NormalizedBook, NormalizedSeriesRating } from "@/lib/providers/types";
import { useRouter } from "next/navigation";
import {
  planReaderClose,
  readHistoryProbe,
  type ReaderCloseIntent,
} from "@/lib/reader/close-plan";

// Chargement différé du lecteur lourd (uniquement quand on ouvre le reader).
const BookReader = dynamic(() => import("./BookReader").then((m) => m.BookReader), {
  ssr: false,
  loading: () => null,
});
import type { ReaderInfo } from "./types";
import { useTranslate } from "@/hooks/useTranslate";
import { useReadProgressMutations } from "@/contexts/ReadProgressMutationsContext";

interface ClientBookWrapperProps {
  book: NormalizedBook;
  pages: number[];
  nextBook: NormalizedBook | null;
  nextBookUnknown?: boolean;
  readerInfo?: ReaderInfo | null;
  seriesRating?: NormalizedSeriesRating | null;
  onRefresh?: () => Promise<void>;
}

export function ClientBookWrapper({
  book,
  pages,
  nextBook,
  nextBookUnknown,
  readerInfo,
  seriesRating,
  onRefresh,
}: ClientBookWrapperProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { forgetBook } = useReadProgressMutations();
  // Le lecteur écrit lui-même la progression de ce livre : un marquage lu/non
  // lu fait depuis une carte ne doit pas se rallumer au retour.
  useEffect(() => {
    forgetBook(book.id);
  }, [book.id, forgetBook]);
  const [isClosing, setIsClosing] = useState(false);

  const exitReader = (intent: ReaderCloseIntent) => {
    const plan = planReaderClose(intent, readHistoryProbe(window), book.seriesId);
    setIsClosing(true);
    if (plan.kind === "back") router.back();
    else router.replace(plan.href);
  };

  const handleCloseReader = (_currentPage: number) => exitReader("close");
  const handleBackToSeries = () => exitReader("series");

  if (isClosing) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("reader.closing")}</span>
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
      onBackToSeries={handleBackToSeries}
      onRefresh={onRefresh}
      nextBook={nextBook}
      nextBookUnknown={nextBookUnknown}
    />
  );
}
