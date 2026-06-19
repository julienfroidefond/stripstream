"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookCover } from "@/components/ui/book-cover";
import { Progress } from "@/components/ui/progress";
import { useAnonymous } from "@/contexts/AnonymousContext";
import type { NormalizedBook } from "@/lib/providers/types";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import type { ReaderInfo } from "../types";
import { useTranslation } from "react-i18next";

interface ReaderInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: NormalizedBook;
  readerInfo?: ReaderInfo | null;
}

export function ReaderInfoDialog({
  open,
  onOpenChange,
  book,
  readerInfo,
}: ReaderInfoDialogProps) {
  const { t } = useTranslation();
  const { isAnonymous } = useAnonymous();
  const description = readerInfo?.bookSummary || readerInfo?.seriesSummary || null;
  const volumeLabel = book.number
    ? t("navigation.volume", { number: book.number })
    : book.title;
  const currentReadingPage = isAnonymous ? 0 : ClientOfflineBookService.getCurrentPage(book);
  const readingProgressValue = book.pageCount > 0
    ? Math.round((currentReadingPage / book.pageCount) * 100)
    : 0;
  const hasPosition = readerInfo?.positionInSeries !== null && readerInfo?.positionInSeries !== undefined;
  const hasTotal = readerInfo?.totalInSeries !== null && readerInfo?.totalInSeries !== undefined;
  const progressValue = hasPosition && hasTotal && (readerInfo?.totalInSeries ?? 0) > 0
    ? Math.round(((readerInfo?.positionInSeries ?? 0) / (readerInfo?.totalInSeries ?? 1)) * 100)
    : null;
  const positionLabel = hasPosition && hasTotal
    ? t("reader.info.positionValue", {
        current: readerInfo?.positionInSeries,
        total: readerInfo?.totalInSeries,
      })
    : hasPosition
      ? t("reader.info.positionCurrentOnly", {
          current: readerInfo?.positionInSeries,
        })
      : t("reader.info.notAvailable");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border-border/60 bg-background/55 backdrop-blur-xl shadow-[0_8px_28px_-18px_rgba(0,0,0,0.75)] sm:w-[calc(100vw-3rem)] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl">
            {readerInfo?.seriesTitle || book.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {book.title !== readerInfo?.seriesTitle ? book.title : volumeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="flex gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 max-[520px]:flex-col">
            <div className="relative mx-auto w-24 shrink-0 self-start overflow-hidden rounded-xl border border-border/60 shadow-sm sm:w-28 md:w-36 max-[520px]:mx-0">
              <div className="aspect-[2/3] w-full">
                <BookCover
                  book={book}
                  alt={book.title}
                  showControls={false}
                  showOverlay={false}
                  showProgressUi={false}
                  className="rounded-none"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 self-center">
              <div className="space-y-6">
                <div>
                  <p className="text-base font-semibold text-foreground">{positionLabel}</p>
                  {progressValue !== null && (
                    <>
                      <Progress value={progressValue} className="mt-3 h-2.5 bg-primary/15" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("reader.info.progressValue", { progress: progressValue })}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <p className="text-base font-medium text-foreground">
                    {t("reader.info.readingProgressValue", {
                      current: currentReadingPage,
                      total: book.pageCount,
                    })}
                  </p>
                  <Progress value={readingProgressValue} className="mt-3 h-2.5 bg-primary/15" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("reader.info.progressValue", { progress: readingProgressValue })}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t("reader.info.description")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/90">
              {description || t("reader.info.noDescription")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
