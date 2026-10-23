"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookCover } from "@/components/ui/book-cover";
import { Progress } from "@/components/ui/progress";
import { useAnonymous } from "@/contexts/AnonymousContext";
import type { NormalizedBook } from "@/lib/providers/types";
import type { ReaderInfo } from "../types";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { CountUp } from "@/components/motion";
import { gsap, prefersReducedMotion, SplitText, useGsapEffect } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Les barres attendent que leur bloc soit posé pour se remplir sous les yeux. */
const PROGRESS_FILL_DELAY = "[&>*]:delay-[550ms]";

interface ReaderInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: NormalizedBook;
  currentPage: number;
  readerInfo?: ReaderInfo | null;
}

export function ReaderInfoDialog({
  open,
  onOpenChange,
  book,
  currentPage,
  readerInfo,
}: ReaderInfoDialogProps) {
  const { t } = useTranslation();
  const { isAnonymous } = useAnonymous();
  const reduce = usePrefersReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  /** Marqueurs d'entrée en scène, états de départ en CSS. */
  const fly = reduce ? {} : { "data-hero-fly": "" };
  const item = reduce ? {} : { "data-hero-item": "" };

  // À chaque ouverture : la cover arrive du fond, les mots du titre basculent
  // en 3D, les blocs remontent en cascade — le langage de l'accueil.
  useGsapEffect(
    () => {
      const content = contentRef.current;
      if (!open || !content) return;
      const fliers = Array.from(content.querySelectorAll<HTMLElement>("[data-hero-fly]"));
      const items = Array.from(content.querySelectorAll<HTMLElement>("[data-hero-item]"));
      const settle = () => {
        [...fliers, ...items].forEach((element) => {
          element.removeAttribute("data-hero-fly");
          element.removeAttribute("data-hero-item");
        });
        gsap.set([...fliers, ...items], { clearProps: "opacity,transform" });
      };
      if (reduce || prefersReducedMotion()) {
        settle();
        return;
      }

      const split = titleRef.current ? SplitText.create(titleRef.current, { type: "words" }) : null;
      const timeline = gsap.timeline({
        defaults: { ease: "projection" },
        onComplete: () => {
          split?.revert();
          settle();
        },
      });
      if (split) {
        timeline.fromTo(
          split.words,
          { opacity: 0, yPercent: 70, rotateX: -95, transformPerspective: 600, transformOrigin: "50% 100%" },
          { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.55, ease: "back.out(2)", stagger: 0.05 },
          0.1
        );
      }
      timeline.fromTo(
        items,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 },
        0.15
      );
      if (fliers.length > 0) {
        timeline.fromTo(
          fliers,
          { opacity: 0, x: -80, z: -500, rotateY: -70, rotateZ: -6, transformPerspective: 900 },
          { opacity: 1, x: 0, z: 0, rotateY: 0, rotateZ: 0, duration: 0.75, ease: "back.out(1.5)" },
          0.2
        );
      }
      return () => {
        timeline.kill();
        split?.revert();
      };
    },
    { dependencies: [open, reduce] }
  );
  // Le pourcentage se compte : on découpe la phrase traduite autour du nombre.
  const percentLabel = (progress: number) => {
    const [before, after = ""] = t("reader.info.progressValue", { progress: "\u0000" }).split("\u0000");
    return (
      <>
        {before}
        <CountUp value={progress} duration={1.2} className="tabular-nums" />
        {after}
      </>
    );
  };
  const description = readerInfo?.bookSummary || readerInfo?.seriesSummary || null;
  const volumeLabel = book.number
    ? t("navigation.volume", { number: book.number })
    : book.title;
  const currentReadingPage = isAnonymous ? 0 : currentPage;
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
      {/* La carte se lève plus franchement que le dialogue standard, puis son
          contenu se déroule : titre mot à mot, couverture qui se redresse,
          blocs en cascade, barres qui se remplissent une fois posées. */}
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto duration-500 ease-projection data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-bottom-10! sm:w-[calc(100vw-3rem)] sm:max-w-5xl">
        <div ref={contentRef} className="space-y-5">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl">
            <span ref={titleRef}>{readerInfo?.seriesTitle || book.title}</span>
          </DialogTitle>
          <div {...item}>
            <DialogDescription className="text-left">
              {book.title !== readerInfo?.seriesTitle ? book.title : volumeLabel}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <section {...item} className="flex gap-4 rounded-2xl bg-surface-2 p-4 max-[520px]:flex-col">
            <div
              {...fly}
              className="relative mx-auto w-24 shrink-0 self-start overflow-hidden rounded-xl bg-surface-3 sm:w-28 md:w-36 max-[520px]:mx-0"
            >
              <div className="aspect-2/3 w-full">
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
                      <Progress value={progressValue} className={`mt-3 h-2.5 bg-primary/15 ${PROGRESS_FILL_DELAY}`} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {percentLabel(progressValue)}
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
                  <Progress value={readingProgressValue} className={`mt-3 h-2.5 bg-primary/15 ${PROGRESS_FILL_DELAY}`} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {percentLabel(readingProgressValue)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div {...item} className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t("reader.info.description")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/90">
              {description || t("reader.info.noDescription")}
            </p>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
