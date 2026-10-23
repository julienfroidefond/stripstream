"use client";

import { ArrowRight, BookOpen, FileText } from "lucide-react";

import { BookCover } from "@/components/ui/book-cover";
import { Button } from "@/components/ui/button";
import { useSpotlightStaging } from "@/components/ui/spotlight-carousel";
import { CountUp, Magnetic, ProgressFill } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedBook } from "@/lib/providers/types";

interface BookSpotlightSlideProps {
  book: NormalizedBook;
  onOpen: () => void;
  /** Petit libellé au-dessus du titre, comme « Reprendre la lecture ». */
  eyebrow: string;
}

/**
 * Diapositive « un tome à la fois » au même format que « Reprendre la
 * lecture » : couverture à gauche, description, progression et bouton.
 */
export function BookSpotlightSlide({ book, onOpen, eyebrow }: BookSpotlightSlideProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const staging = useSpotlightStaging();

  const volumeLabel = book.number ? t("navigation.volume", { number: book.number }) : null;
  const title = book.title?.trim() || volumeLabel || "";
  const showVolume = Boolean(book.title?.trim() && volumeLabel);
  const pagesLabel =
    book.pageCount > 0
      ? `${book.pageCount} ${book.pageCount > 1 ? t("books.pages_plural") : t("books.pages")}`
      : null;
  const summary = book.summary?.trim() || null;
  const currentPage = book.readProgress?.page ?? 0;
  const totalPages = book.pageCount;
  const hasProgress = !isAnonymous && currentPage > 0 && totalPages > 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : 0;
  const ctaLabel = book.readProgress?.completed
    ? t("navigation.rereadBook")
    : currentPage > 0
      ? t("navigation.continueBook")
      : t("navigation.readBook");

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
      {/* L'enveloppe fixe capte le survol, le bouton seul se soulève. */}
      <div className="group/cover mx-auto shrink-0 sm:mx-0">
        <button
          type="button"
          onClick={onOpen}
          {...staging.cover}
          className="relative block aspect-2/3 w-[168px] overflow-hidden rounded-xl bg-surface-2 sm:w-[196px] transition-transform duration-350 ease-out group-hover/cover:-translate-y-2.5 group-hover/cover:-rotate-2 group-hover/cover:scale-104 motion-reduce:transition-none motion-reduce:group-hover/cover:translate-none motion-reduce:group-hover/cover:rotate-none motion-reduce:group-hover/cover:scale-none"
          aria-label={ctaLabel}
        >
          <BookCover
            book={book}
            alt={title}
            showControls={false}
            showProgressUi={false}
            overlayVariant="home"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...staging.item}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {eyebrow}
        </div>

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <span {...staging.title}>{title}</span>
        </h2>

        {(showVolume || pagesLabel) && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start"
            {...staging.item}
          >
            {showVolume && <span>{volumeLabel}</span>}
            {pagesLabel && (
              <span className="flex items-center gap-1.5 tabular-nums">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {pagesLabel}
              </span>
            )}
          </div>
        )}

        {summary && (
          <p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...staging.item}
          >
            {summary}
          </p>
        )}

        {hasProgress && (
          <div className="mx-auto w-full max-w-md space-y-2 sm:mx-0" {...staging.item}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <ProgressFill percent={percent} />
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={percent} suffix="%" />
              </span>
              <span className="tabular-nums">
                {t("home.hero.page", { current: currentPage, total: totalPages })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-center sm:justify-start" {...staging.item}>
          <Magnetic>
            <Button onClick={onOpen} size="lg" className="group/cta gap-2 font-semibold">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}
