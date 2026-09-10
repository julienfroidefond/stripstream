"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { loadHomeFeed } from "@/app/actions/home";

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
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loadedBooks, setLoadedBooks] = useState(books.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(books.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();

  const total = loadedBooks.length;
  const hasMany = total > 1;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const showLoadMore = hasMore && safeIndex === total - 1;

  if (total === 0) return null;

  const book = loadedBooks[safeIndex];

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadHomeFeed("continue-reading", loadedBooks.length);
      setLoadedBooks(result.items as NormalizedBook[]);
      setHasMore(result.hasMore);
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

  return (
    <section
      data-testid="home-continue-reading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/40",
        // Mobile : couverture en fond avec dégradé discret
        "bg-card/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-sm",
        // Desktop : fond uni, mise en page côte-à-côte
        "sm:bg-card/60"
      )}
      aria-roledescription="carousel"
      aria-label={t("home.hero.label")}
    >
      {/* Mobile only: cover as subtle blurred background */}
      <div className="absolute inset-0 sm:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={book.thumbnailUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-top opacity-35 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/60 to-card/30" />
      </div>

      <div className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7">
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
            className="flex cursor-grab flex-col gap-5 active:cursor-grabbing sm:flex-row sm:gap-7"
          >
            {/* Cover */}
            <button
              type="button"
              onClick={handleResume}
              className="group/cover relative mx-auto block aspect-[2/3] w-[170px] flex-shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-lg shadow-black/40 transition-transform duration-200 hover:-translate-y-0.5 sm:mx-0 sm:w-[180px]"
              aria-label={t("home.hero.resume")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.thumbnailUrl}
                alt={t("home.hero.coverAlt", { title: bookTitle })}
                loading="eager"
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.03]"
              />
            </button>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-center gap-3 text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start">
                <BookOpen className="h-3.5 w-3.5" />
                {t("home.hero.label")}
              </div>

              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                {seriesName ? (
                  <>
                    {seriesName}
                    {volumeLabel && (
                      <span className="ml-2 text-lg font-normal text-muted-foreground sm:text-xl">
                        — {volumeLabel}
                      </span>
                    )}
                  </>
                ) : (
                  volumeLabel ?? bookTitle
                )}
              </h2>

              {summary && (
                <p className="line-clamp-2 text-sm text-muted-foreground/90 sm:text-base">
                  {summary}
                </p>
              )}

              {hasProgress && (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-500 to-fuchsia-500 transition-[width] duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
                    <span className="font-semibold text-foreground">{percent}%</span>
                    <span>{t("home.hero.page", { current: currentPage, total: totalPages })}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex justify-center sm:justify-start">
                <Button
                  data-testid="home-resume-reading"
                  onClick={handleResume}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 font-semibold text-white shadow-lg shadow-indigo-900/30 hover:from-indigo-500 hover:via-purple-500 hover:to-fuchsia-500 hover:text-white"
                >
                  {hasProgress ? t("home.hero.resume") : t("home.hero.start")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {(hasMany || showLoadMore) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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
                      "h-1.5 rounded-full transition-all duration-300",
                      i === safeIndex
                        ? "w-8 bg-gradient-to-r from-primary to-fuchsia-500"
                        : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60"
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
