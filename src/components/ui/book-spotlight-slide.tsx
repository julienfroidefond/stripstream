"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, FileText } from "lucide-react";

import { BookCover } from "@/components/ui/book-cover";
import { Button } from "@/components/ui/button";
import { useSpotlightReveal } from "@/components/ui/spotlight-carousel";
import { CountUp, Magnetic, SplitWords } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { EASE_OUT, EASE_PROJECTION, fadeUp, staggerContainer } from "@/lib/motion";
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
  const reduce = useReducedMotion();
  const revealed = useSpotlightReveal();

  const stagedContent = reduce
    ? {}
    : {
        variants: staggerContainer(0.07, 0.08),
        initial: "hidden" as const,
        animate: revealed ? ("visible" as const) : ("hidden" as const),
      };
  const stagedItem = reduce ? {} : { variants: fadeUp };

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
    <motion.div
      className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9"
      {...stagedContent}
    >
      <motion.button
        type="button"
        variants={reduce ? undefined : fadeUp}
        onClick={onOpen}
        whileHover={reduce ? undefined : { y: -10, rotateZ: -2, scale: 1.04 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="group/cover relative mx-auto block aspect-2/3 w-[168px] shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:mx-0 sm:w-[196px]"
        aria-label={ctaLabel}
      >
        <BookCover
          book={book}
          alt={title}
          showControls={false}
          showProgressUi={false}
          overlayVariant="home"
        />
      </motion.button>

      <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...stagedItem}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {eyebrow}
        </motion.div>

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <SplitWords text={title} />
        </h2>

        {(showVolume || pagesLabel) && (
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start"
            {...stagedItem}
          >
            {showVolume && <span>{volumeLabel}</span>}
            {pagesLabel && (
              <span className="flex items-center gap-1.5 tabular-nums">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {pagesLabel}
              </span>
            )}
          </motion.div>
        )}

        {summary && (
          <motion.p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...stagedItem}
          >
            {summary}
          </motion.p>
        )}

        {hasProgress && (
          <motion.div className="mx-auto w-full max-w-md space-y-2 sm:mx-0" {...stagedItem}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: percent / 100 }}
                transition={{ duration: 1, ease: EASE_PROJECTION, delay: 0.35 }}
                style={{ width: "100%" }}
              />
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={percent} suffix="%" />
              </span>
              <span className="tabular-nums">
                {t("home.hero.page", { current: currentPage, total: totalPages })}
              </span>
            </div>
          </motion.div>
        )}

        <motion.div className="mt-1 flex justify-center sm:justify-start" {...stagedItem}>
          <Magnetic>
            <Button onClick={onOpen} size="lg" className="group/cta gap-2 font-semibold">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </motion.div>
      </div>
    </motion.div>
  );
}
