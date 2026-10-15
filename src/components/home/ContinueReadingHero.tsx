"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { loadHomeFeed } from "@/app/actions/home";
import { CountUp, Magnetic } from "@/components/motion";
import { EASE_OUT, EASE_PROJECTION, fadeUp, staggerContainer } from "@/lib/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";

interface ContinueReadingHeroProps {
  books: NormalizedBook[];
  series?: NormalizedSeries[];
}

const SWIPE_THRESHOLD = 60;
const ITEMS_PER_PAGE = 8;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export function ContinueReadingHero({ books, series }: ContinueReadingHeroProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loadedBooks, setLoadedBooks] = useState(books.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(books.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();

  const total = loadedBooks.length;
  const hasMany = total > 1;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const showLoadMore = hasMore;

  if (total === 0) return null;

  const book = loadedBooks[safeIndex];

  const handleLoadMore = () => {
    const firstNew = loadedBooks.length;
    startTransition(async () => {
      const result = await loadHomeFeed("continue-reading", firstNew);
      setLoadedBooks(result.items as NormalizedBook[]);
      setHasMore(result.hasMore);
      // La suite se pose sur la première nouveauté : le clic se voit.
      if (result.items.length > firstNew) {
        setDirection(1);
        setIndex(firstNew);
      }
    });
  };
  const target = book.seriesId?.trim() ?? "";
  const targetLower = target.toLowerCase();
  const matchedSeries =
    series?.find(
      (s) =>
        s.id === target ||
        s.name === target ||
        s.name.trim().toLowerCase() === targetLower
    ) ?? null;
  const seriesName = matchedSeries?.name ?? null;
  const summary = (() => {
    const fromBook = book.summary?.trim();
    if (fromBook) return fromBook;
    const fromSeries = matchedSeries?.summary?.trim();
    if (fromSeries) return fromSeries;
    const genres = matchedSeries?.genres?.filter(Boolean).slice(0, 3) ?? [];
    if (genres.length > 0) return genres.join(" • ");
    const author = matchedSeries?.authors?.find((a) => a.name)?.name;
    if (author) return author;
    return null;
  })();
  const currentPage = book.readProgress?.page ?? 0;
  const totalPages = book.pageCount;
  const hasProgress = currentPage > 0 && totalPages > 0;
  const percent = hasProgress ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  const volumeLabel = book.number ? t("home.hero.tomeLabel", { number: book.number }) : null;
  const bookTitle = book.title?.trim() || volumeLabel || "";

  const goTo = (target: number, dir: number) => {
    setDirection(dir);
    setIndex(((target % total) + total) % total);
  };
  const handleResume = () => router.push(`/books/${book.id}`);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!hasMany) return;
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(safeIndex + 1, 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(safeIndex - 1, -1);
  };

  const stagedContent = reduce
    ? {}
    : { variants: staggerContainer(0.07, 0.08), initial: "hidden" as const, animate: "visible" as const };
  const stagedItem = reduce ? {} : { variants: fadeUp };

  return (
    <section
      data-testid="home-continue-reading"
      className="grain relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
      aria-label={t("home.hero.label")}
    >
      {/* L'artwork courant est la seule source de lumière de l'affiche.
          Chaque changement de tome éteint puis rallume la salle. */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={book.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <ProjectionBackdrop src={book.thumbnailUrl} fadeIn={false} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative overflow-hidden px-5 py-6 sm:px-8 sm:py-9">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={book.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 320, damping: 34 }, opacity: { duration: 0.18 } }}
            drag={hasMany ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <motion.div
              className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9"
              {...stagedContent}
            >
              {/* Cover */}
              <motion.button
                type="button"
                variants={reduce ? undefined : fadeUp}
                onClick={handleResume}
                whileHover={reduce ? undefined : { y: -5 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="group/cover relative mx-auto block aspect-2/3 w-[168px] shrink-0 overflow-hidden rounded-xl ring-1 ring-border sm:mx-0 sm:w-[196px]"
                aria-label={t("home.hero.resume")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.thumbnailUrl}
                  alt={t("home.hero.coverAlt", { title: bookTitle })}
                  loading="eager"
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/cover:scale-[1.05]"
                />
              </motion.button>

              {/* Content */}
              <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
                <motion.div
                  className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
                  {...stagedItem}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("home.hero.label")}
                </motion.div>

                <motion.h2
                  className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl"
                  {...stagedItem}
                >
                  {seriesName ? (
                    <>
                      {seriesName}
                      {volumeLabel && (
                        <span className="ml-3 align-middle text-lg font-normal text-muted-foreground sm:text-xl">
                          {volumeLabel}
                        </span>
                      )}
                    </>
                  ) : (
                    volumeLabel ?? bookTitle
                  )}
                </motion.h2>

                {summary && (
                  <motion.p className="line-clamp-2 text-sm text-muted-foreground sm:text-base" {...stagedItem}>
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
                      <span className="tabular-nums">{t("home.hero.page", { current: currentPage, total: totalPages })}</span>
                    </div>
                  </motion.div>
                )}

                <motion.div className="mt-1 flex justify-center sm:justify-start" {...stagedItem}>
                  <Magnetic>
                    <Button
                      data-testid="home-resume-reading"
                      onClick={handleResume}
                      size="lg"
                      className="group/cta gap-2 font-semibold"
                    >
                      {hasProgress ? t("home.hero.resume") : t("home.hero.start")}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
                    </Button>
                  </Magnetic>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {(hasMany || showLoadMore) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {hasMany && (
              <div
                role="tablist"
                aria-label={t("home.hero.label")}
                className="flex items-center justify-center gap-2"
              >
                {loadedBooks.map((b, i) => (
                  <button
                    key={b.id}
                    role="tab"
                    aria-selected={i === safeIndex}
                    aria-label={`${i + 1} / ${total}`}
                    onClick={() => goTo(i, i > safeIndex ? 1 : -1)}
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                      i === safeIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-foreground/25 hover:bg-foreground/45"
                    )}
                  />
                ))}
              </div>
            )}
            {showLoadMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isPending}
              >
                {isPending ? t("navigation.loading") : t("navigation.loadMore")}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
