"use client";

import { useState, useCallback, memo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, UserRound, Tag, Building2, Sparkles, Bookmark, ArrowRight, LayoutGrid, GalleryHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { SeriesCover } from "@/components/ui/series-cover";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { loadHomeFeed } from "@/app/actions/home";
import { GlowLayer, Magnetic, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";
import { CAROUSEL_TRANSITION, EASE_OUT, carouselSlide, fadeUp, staggerContainer } from "@/lib/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";

const REASON_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  same_reading_list: { icon: Bookmark,  className: "bg-amber-600/90 text-white" },
  same_author:       { icon: UserRound, className: "bg-teal-600/90 text-white" },
  same_genre:        { icon: Tag,       className: "bg-cyan-600/90 text-white" },
  same_publisher:    { icon: Building2, className: "bg-emerald-600/90 text-white" },
};

const SWIPE_THRESHOLD = 60;
const ITEMS_PER_PAGE = 8;

type ViewMode = "hero" | "grid";
const VIEW_MODE_KEY = "recommendations-view-mode";

interface RecommendationsRowProps {
  series: NormalizedSeries[];
  /** Renseigné par l'appel serveur : la liste reçue est déjà tronquée. */
  initialHasMore?: boolean;
}

export function RecommendationsRow({ series, initialHasMore = false }: RecommendationsRowProps) {
  const { t } = useTranslate();
  const [loadedSeries, setLoadedSeries] = useState(series.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(initialHasMore || series.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  /**
   * Navigation du carrousel « Pour vous ». Elle vit ici parce que « Voir plus »
   * ajoute des propositions en fin de liste et doit pouvoir s'y poser.
   */
  const [hero, setHero] = useState<{ index: number; direction: number }>({ index: 0, direction: 0 });

  const handleLoadMore = () => {
    const firstNew = loadedSeries.length;
    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", firstNew);
      setLoadedSeries(result.items as NormalizedSeries[]);
      setHasMore(result.hasMore);
      if (result.items.length > firstNew) setHero({ index: firstNew, direction: 1 });
    });
  };

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "hero";
    return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) ?? "hero";
  });

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "hero" ? "grid" : "hero";
      localStorage.setItem(VIEW_MODE_KEY, next);
      return next;
    });
  }, []);

  if (!series.length) return null;

  return (
    <Section
      title={t("home.sections.recommendations")}
      icon={Wand2}
      className="space-y-5"
      headerClassName="pb-1"
      actions={
        <button
          type="button"
          onClick={toggleViewMode}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {viewMode === "hero" ? (
            <LayoutGrid className="h-4 w-4" />
          ) : (
            <GalleryHorizontal className="h-4 w-4" />
          )}
        </button>
      }
    >
      {viewMode === "hero" ? (
        <RecommendationHero
          series={loadedSeries}
          hasMore={hasMore}
          isPending={isPending}
          onLoadMore={handleLoadMore}
          index={hero.index}
          direction={hero.direction}
          onNavigate={setHero}
        />
      ) : (
        <StaggerGroup stagger={0.08} effect="deal" amount={0.25}>
          <ScrollContainer
            showArrows={true}
            scrollAmount={400}
            arrowLeftLabel={t("navigation.scrollLeft")}
            arrowRightLabel={t("navigation.scrollRight")}
          >
            {loadedSeries.map((s) => (
              <StaggerItem key={s.id} className="shrink-0">
                <RecommendationCard series={s} />
              </StaggerItem>
            ))}
            {hasMore && (
              <StaggerItem className="shrink-0">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isPending}
                  className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
                >
                  {isPending ? t("navigation.loading") : t("navigation.loadMore")}
                </button>
              </StaggerItem>
            )}
          </ScrollContainer>
        </StaggerGroup>
      )}
    </Section>
  );
}

/* ── Hero (swipeable, one at a time) ───────────────────────────────────────── */

interface RecommendationHeroProps {
  series: NormalizedSeries[];
  hasMore: boolean;
  isPending: boolean;
  onLoadMore: () => void;
  index: number;
  direction: number;
  onNavigate: (nav: { index: number; direction: number }) => void;
}

function RecommendationHero({
  series,
  hasMore,
  isPending,
  onLoadMore,
  index,
  direction,
  onNavigate,
}: RecommendationHeroProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const reduce = useReducedMotion();

  const total = series.length;
  const hasMany = total > 1;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const showLoadMore = hasMore;
  const s = series[safeIndex];

  const goTo = (target: number, dir: number) => {
    onNavigate({ index: ((target % total) + total) % total, direction: dir });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!hasMany) return;
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(safeIndex + 1, 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(safeIndex - 1, -1);
  };

  const summary = (() => {
    const fromSeries = s.summary?.trim();
    if (fromSeries) return fromSeries;
    const genres = s.genres?.filter(Boolean).slice(0, 3) ?? [];
    if (genres.length > 0) return genres.join(" • ");
    return s.authors?.find((a) => a.name)?.name ?? null;
  })();

  const stagedContent = reduce
    ? {}
    : { variants: staggerContainer(0.07, 0.08), initial: "hidden" as const, animate: "visible" as const };
  const stagedItem = reduce ? {} : { variants: fadeUp };

  return (
    <section
      className="grain relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
    >
      {/* L'affiche emprunte sa lumière à la série courante. */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={`backdrop-${s.id}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <ProjectionBackdrop src={s.thumbnailUrl} fadeIn={false} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={s.id}
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
              className="flex flex-col gap-5 sm:flex-row sm:gap-7"
              {...stagedContent}
            >
              {/* Cover */}
              <motion.button
                type="button"
                variants={reduce ? undefined : fadeUp}
                onClick={() => router.push(`/series/${s.id}`)}
                whileHover={reduce ? undefined : { y: -5 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="group/cover relative mx-auto block aspect-2/3 w-[170px] shrink-0 overflow-hidden rounded-xl ring-1 ring-border sm:mx-0 sm:w-[180px]"
              >
                <SeriesCover
                  series={s}
                  alt={s.name}
                  isAnonymous={isAnonymous}
                  showProgressUi={false}
                />
              </motion.button>

              {/* Content */}
              <div className="flex flex-1 flex-col justify-center gap-3 text-center text-foreground sm:text-left">
                {s.becauseOf && s.becauseOf.length > 0 && (
                  <motion.p
                    className="flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start"
                    {...stagedItem}
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                    <span className="font-medium text-foreground/75">{s.becauseOf.join(", ")}</span>
                  </motion.p>
                )}

                <motion.h2
                  className="font-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl"
                  {...stagedItem}
                >
                  {s.name}
                </motion.h2>

                {summary && (
                  <motion.p className="line-clamp-2 text-sm text-muted-foreground sm:text-base" {...stagedItem}>
                    {summary}
                  </motion.p>
                )}

                {s.matchReasons && s.matchReasons.length > 0 && (
                  <motion.div
                    className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
                    {...stagedItem}
                  >
                    {s.matchReasons.map((reason) => {
                      const config = REASON_CONFIG[reason];
                      const Icon = config?.icon;
                      const label = t(`series.matchReasons.${reason}` as Parameters<typeof t>[0]) ?? reason;
                      return (
                        <span
                          key={reason}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            config?.className ?? "bg-black/50 text-white"
                          )}
                        >
                          {Icon && <Icon className="h-3 w-3 shrink-0" />}
                          {label}
                        </span>
                      );
                    })}
                  </motion.div>
                )}

                <motion.div className="mt-2 flex justify-center sm:justify-start" {...stagedItem}>
                  <Magnetic>
                    <Button
                      onClick={() => router.push(`/series/${s.id}`)}
                      size="lg"
                      className="group/cta gap-2 font-semibold"
                    >
                      {t("home.recommendations.discover")}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
                    </Button>
                  </Magnetic>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {(hasMany || showLoadMore) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {hasMany && (
              <div role="tablist" className="flex items-center justify-center gap-2">
                {series.map((item, i) => (
                  <button
                    key={item.id}
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
                onClick={onLoadMore}
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

/* ── Card (scroll grid) ─────────────────────────────────────────────────────── */

const RecommendationCard = memo(function RecommendationCard({ series: s }: { series: NormalizedSeries }) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const glowRef = useRef<HTMLButtonElement>(null);
  const handleGlow = usePointerGlow(glowRef);

  return (
    <button
      type="button"
      ref={glowRef}
      onMouseMove={handleGlow}
      onClick={() => router.push(`/series/${s.id}`)}
      className="group relative flex w-[160px] shrink-0 flex-col gap-1.5 sm:w-[188px]"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection group-hover:-translate-y-2 group-hover:ring-border motion-reduce:transition-none">
        <div className="absolute inset-0 transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none">
          <SeriesCover
            series={s}
            alt={s.name}
            isAnonymous={isAnonymous}
            showProgressUi={false}
          />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
          <p className="line-clamp-2 text-left text-xs font-semibold text-white">{s.name}</p>
        </div>

        {s.matchReasons && s.matchReasons.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {s.matchReasons.map((reason) => {
              const config = REASON_CONFIG[reason];
              const Icon = config?.icon;
              return (
                <span
                  key={reason}
                  title={t(`series.matchReasons.${reason}` as Parameters<typeof t>[0]) ?? reason}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    config?.className ?? "bg-black/70 text-white"
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                </span>
              );
            })}
          </div>
        )}

        <GlowLayer />
      </div>

      {s.becauseOf && s.becauseOf.length > 0 && (
        <p className="line-clamp-2 flex items-start gap-1 px-0.5 text-left text-[11px] text-muted-foreground">
          <Sparkles className="mt-px h-3 w-3 shrink-0 text-primary/60" />
          <span className="font-medium text-foreground/70">{s.becauseOf.join(", ")}</span>
        </p>
      )}
    </button>
  );
});
