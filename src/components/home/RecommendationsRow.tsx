"use client";

import { useState, useCallback, memo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, UserRound, Tag, Building2, Sparkles, Bookmark, ArrowRight, LayoutGrid, GalleryHorizontal } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
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

const REASON_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  same_reading_list: { icon: Bookmark,  className: "bg-amber-600/90 text-white" },
  same_author:       { icon: UserRound, className: "bg-blue-600/90 text-white" },
  same_genre:        { icon: Tag,       className: "bg-violet-600/90 text-white" },
  same_publisher:    { icon: Building2, className: "bg-emerald-600/90 text-white" },
};

const SWIPE_THRESHOLD = 60;
const ITEMS_PER_PAGE = 8;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

type ViewMode = "hero" | "grid";
const VIEW_MODE_KEY = "recommendations-view-mode";

interface RecommendationsRowProps {
  series: NormalizedSeries[];
}

export function RecommendationsRow({ series }: RecommendationsRowProps) {
  const { t } = useTranslate();
  const [loadedSeries, setLoadedSeries] = useState(series.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(series.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", loadedSeries.length);
      setLoadedSeries(result.items as NormalizedSeries[]);
      setHasMore(result.hasMore);
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
      headerClassName="border-b border-border/50 pb-2"
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
        />
      ) : (
        <ScrollContainer
          showArrows={true}
          scrollAmount={400}
          arrowLeftLabel={t("navigation.scrollLeft")}
          arrowRightLabel={t("navigation.scrollRight")}
        >
          {loadedSeries.map((s) => (
            <RecommendationCard key={s.id} series={s} />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isPending}
              className="flex min-h-[282px] w-[150px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-foreground sm:min-h-[300px]"
            >
              {isPending ? t("navigation.loading") : t("navigation.loadMore")}
            </button>
          )}
        </ScrollContainer>
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
}

function RecommendationHero({ series, hasMore, isPending, onLoadMore }: RecommendationHeroProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const total = series.length;
  const hasMany = total > 1;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const showLoadMore = hasMore && safeIndex === total - 1;
  const s = series[safeIndex];

  const goTo = (target: number, dir: number) => {
    setDirection(dir);
    setIndex(((target % total) + total) % total);
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

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xs sm:bg-card/60"
      aria-roledescription="carousel"
    >
      {/* Mobile: blurred cover bg */}
      <div className="absolute inset-0 sm:hidden">
        <SeriesCover
          series={s}
          alt=""
          isAnonymous={isAnonymous}
          showProgressUi={false}
          className="h-full w-full object-cover object-top opacity-35 blur-xs scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-card/90 via-card/60 to-card/30" />
      </div>

      <div className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={s.id}
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
              onClick={() => router.push(`/series/${s.id}`)}
              className="group/cover relative mx-auto block aspect-2/3 w-[170px] shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-lg shadow-black/40 transition-transform duration-200 hover:-translate-y-0.5 sm:mx-0 sm:w-[180px]"
            >
              <SeriesCover
                series={s}
                alt={s.name}
                isAnonymous={isAnonymous}
                showProgressUi={false}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.03]"
              />
            </button>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-center gap-3 text-center sm:text-left">
              {s.becauseOf && s.becauseOf.length > 0 && (
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start">
                  <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
                  <span className="font-medium text-foreground/70">{s.becauseOf.join(", ")}</span>
                </p>
              )}

              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">{s.name}</h2>

              {summary && (
                <p className="line-clamp-2 text-sm text-muted-foreground/90 sm:text-base">{summary}</p>
              )}

              {s.matchReasons && s.matchReasons.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {s.matchReasons.map((reason) => {
                    const config = REASON_CONFIG[reason];
                    const Icon = config?.icon;
                    const label = t(`series.matchReasons.${reason}` as Parameters<typeof t>[0]) ?? reason;
                    return (
                      <span
                        key={reason}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-xs",
                          config?.className ?? "bg-black/50 text-white"
                        )}
                      >
                        {Icon && <Icon className="h-3 w-3 shrink-0" />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex justify-center sm:justify-start">
                <Button
                  onClick={() => router.push(`/series/${s.id}`)}
                  size="lg"
                  className="gap-2 bg-linear-to-r from-indigo-600 via-purple-600 to-fuchsia-600 font-semibold text-white shadow-lg shadow-indigo-900/30 hover:from-indigo-500 hover:via-purple-500 hover:to-fuchsia-500 hover:text-white"
                >
                  {t("home.recommendations.discover")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
                      "h-1.5 rounded-full transition-all duration-300",
                      i === safeIndex
                        ? "w-8 bg-linear-to-r from-primary to-fuchsia-500"
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

  return (
    <button
      type="button"
      onClick={() => router.push(`/series/${s.id}`)}
      className="group relative flex w-[160px] shrink-0 flex-col gap-1.5 sm:w-[188px]"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-border/60 bg-muted shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <SeriesCover series={s} alt={s.name} isAnonymous={isAnonymous} showProgressUi={false} />

        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
                    "flex h-6 w-6 items-center justify-center rounded-full shadow-sm backdrop-blur-xs",
                    config?.className ?? "bg-black/70 text-white"
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                </span>
              );
            })}
          </div>
        )}
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
