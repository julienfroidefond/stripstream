"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { loadHomeFeed } from "@/app/actions/home";
import { CountUp, Magnetic, SplitWords, useSceneExit } from "@/components/motion";
import {
  CAROUSEL_TRANSITION,
  EASE_OUT,
  EASE_PROJECTION,
  carouselSlide,
  curtainOpen,
  fadeUp,
  liftIn,
  staggerContainer,
} from "@/lib/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";

interface ContinueReadingHeroProps {
  books: NormalizedBook[];
  series?: NormalizedSeries[];
}

const SWIPE_THRESHOLD = 60;
const ITEMS_PER_PAGE = 8;

export function ContinueReadingHero({ books, series }: ContinueReadingHeroProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loadedBooks, setLoadedBooks] = useState(books.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(books.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);
  const scene = useSceneExit(sectionRef);
  /**
   * La mise en scène (cover posée dans son cadre, texte qui monte) ne joue
   * qu'à l'ouverture. Le carrousel change de diapositive ensuite : le geste se
   * rejouerait sinon sur chaque glissement, et l'image repasserait en petit à
   * chaque fois.
   */
  const [introPlaying, setIntroPlaying] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIntroPlaying(false), 1500);
    return () => clearTimeout(timer);
  }, []);
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
        setIntroPlaying(false);
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
    // Un glissement interrompt l'ouverture : on fige la mise en scène pour ne
    // pas la relancer sur la diapositive suivante.
    setIntroPlaying(false);
    setDirection(dir);
    setIndex(((target % total) + total) % total);
  };
  const handleResume = () => router.push(`/books/${book.id}`);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!hasMany) return;
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(safeIndex + 1, 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(safeIndex - 1, -1);
  };

  const staged = !reduce && introPlaying;
  const stagedContent = staged
    ? { variants: staggerContainer(0.07, 0.08), initial: "hidden" as const, animate: "visible" as const }
    : {};
  const stagedItem = staged ? { variants: fadeUp } : {};

  return (
    <motion.section
      ref={sectionRef}
      data-testid="home-continue-reading"
      className="grain relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
      aria-label={t("home.hero.label")}
      // Intro : le rideau s'ouvre depuis un cadre resserré. Au défilement,
      // l'affiche recule (échelle) pendant que la page passe devant.
      variants={reduce ? undefined : curtainOpen}
      initial={reduce ? undefined : "hidden"}
      animate={reduce ? undefined : "visible"}
      style={{ scale: scene.sceneScale }}
    >
      {/* L'artwork courant est la seule source de lumière de l'affiche.
          Chaque changement de tome éteint puis rallume la salle. Le fond
          recule à l'ouverture, puis glisse moins vite que la page. */}
      <motion.div
        className="absolute inset-0"
        style={{ y: scene.backdropY, scale: scene.backdropScale }}
      >
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: EASE_PROJECTION }}
        >
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
        </motion.div>
      </motion.div>

      <motion.div
        className="relative overflow-hidden px-5 py-6 sm:px-8 sm:py-9"
        style={{ y: scene.contentY, opacity: scene.contentOpacity, filter: scene.contentBlur }}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={book.id}
            custom={direction}
            variants={carouselSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={CAROUSEL_TRANSITION}
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
                data-testid="home-hero-cover"
                variants={reduce ? undefined : liftIn}
                onClick={handleResume}
                whileHover={reduce ? undefined : { y: -10, rotateZ: -2, scale: 1.04 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="group/cover relative mx-auto block aspect-2/3 w-[168px] shrink-0 overflow-hidden rounded-xl sm:mx-0 sm:w-[196px]"
                aria-label={t("home.hero.resume")}
              >
                {/* Le cadre sert de masque : la cover se lève dedans. Le liseré
                    est porté par la cover elle-même, pas par le cadre, pour
                    ne jamais dessiner le contour d'un cadre encore vide. */}
                <span
                  className={cn(
                    "relative block h-full w-full",
                    introPlaying && "motion-safe:animate-cover-rise"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.thumbnailUrl}
                    alt={t("home.hero.coverAlt", { title: bookTitle })}
                    loading="eager"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-border"
                  />
                </span>
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

                <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
                  {seriesName ? (
                    <>
                      <SplitWords text={seriesName} />
                      {volumeLabel && (
                        <motion.span
                          {...stagedItem}
                          className="ml-3 inline-block align-middle text-lg font-normal text-muted-foreground sm:text-xl"
                        >
                          {volumeLabel}
                        </motion.span>
                      )}
                    </>
                  ) : (
                    <SplitWords text={volumeLabel ?? bookTitle} />
                  )}
                </h2>

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
      </motion.div>
    </motion.section>
  );
}
