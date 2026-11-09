"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  BookOpen,
  BookOpenCheck,
  Flame,
  Heart,
  History,
  Layers,
  ListChecks,
  PauseCircle,
  Search,
  Shuffle,
  TrendingUp,
  X,
} from "lucide-react";
import { addToFavorites, removeFromFavorites } from "@/app/actions/favorites";
import { shelveSeries, unshelveSeries } from "@/app/actions/series-shelf";
import { SortMenu, type SortMenuOption } from "@/components/common/SortMenu";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import logger from "@/lib/logger";
import {
  DEFAULT_IN_PROGRESS_SORT,
  filterInProgressItems,
  getInProgressStats,
  isPaused,
  sortInProgressItems,
  type InProgressFilter,
  type InProgressItem,
  type InProgressSort,
} from "@/lib/services/in-progress.service";
import { InProgressCard } from "@/components/in-progress/InProgressCard";
import { InProgressHero } from "@/components/in-progress/InProgressHero";
import { InProgressRail } from "@/components/in-progress/InProgressRail";
import { InProgressStats } from "@/components/in-progress/InProgressStats";
import {
  InProgressAnonymousState,
  InProgressEmptyState,
  InProgressNoResultsState,
} from "@/components/in-progress/InProgressStates";

interface InProgressContentProps {
  items: InProgressItem[];
  favoriteIds: string[];
  now: number;
  canShelve?: boolean;
}

const FILTERS: Array<{
  value: InProgressFilter;
  icon: typeof Layers;
  labelKey: string;
}> = [
  { value: "all", icon: Layers, labelKey: "inProgress.filters.all" },
  { value: "favorites", icon: Heart, labelKey: "inProgress.filters.favorites" },
  { value: "almost-done", icon: Flame, labelKey: "inProgress.filters.almostDone" },
  { value: "paused", icon: PauseCircle, labelKey: "inProgress.filters.paused" },
];

interface FavoriteOverridesState {
  /** Signature de la liste serveur sur laquelle portent les overrides. */
  base: string;
  values: Map<string, boolean>;
}

export function InProgressContent({
  items,
  favoriteIds,
  now,
  canShelve = false,
}: InProgressContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslate();
  const { isAnonymous, toggleAnonymous } = useAnonymous();
  const reduceMotion = usePrefersReducedMotion();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InProgressFilter>("all");
  const [sort, setSort] = useState<InProgressSort>(DEFAULT_IN_PROGRESS_SORT);
  const favoriteIdsKey = useMemo(
    () => [...favoriteIds].sort().join("|"),
    [favoriteIds]
  );
  const [favoriteOverrides, setFavoriteOverrides] = useState<FavoriteOverridesState>(
    () => ({ base: favoriteIdsKey, values: new Map() })
  );
  const [shelvingIds, setShelvingIds] = useState<Set<string>>(() => new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isDisablingAnonymous, startAnonymousTransition] = useTransition();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  // Les overrides ne valent que pour la liste serveur qui les a vus naître :
  // après un router.refresh, la nouvelle liste reprend naturellement la main.
  const favoriteSet = useMemo(() => {
    const set = new Set(favoriteIds);
    if (favoriteOverrides.base !== favoriteIdsKey) return set;
    for (const [seriesId, value] of favoriteOverrides.values) {
      if (value) set.add(seriesId);
      else set.delete(seriesId);
    }
    return set;
  }, [favoriteIds, favoriteIdsKey, favoriteOverrides]);

  const setFavoriteOverride = useCallback(
    (seriesId: string, value: boolean | null) => {
      setFavoriteOverrides((current) => {
        const values =
          current.base === favoriteIdsKey
            ? new Map(current.values)
            : new Map<string, boolean>();
        if (value === null) values.delete(seriesId);
        else values.set(seriesId, value);
        return { base: favoriteIdsKey, values };
      });
    },
    [favoriteIdsKey]
  );

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setHighlightedId(null);
  }, []);

  const handleFilterChange = useCallback((value: InProgressFilter) => {
    setFilter(value);
    setHighlightedId(null);
  }, []);

  const handleSortChange = useCallback((value: InProgressSort) => {
    setSort(value);
    setHighlightedId(null);
  }, []);

  const filteredItems = useMemo(
    () =>
      sortInProgressItems(
        filterInProgressItems(items, query, filter, favoriteSet),
        sort
      ),
    [items, query, filter, favoriteSet, sort]
  );

  const stats = useMemo(
    () => getInProgressStats(items, favoriteSet),
    [items, favoriteSet]
  );

  // Le tirage aléatoire sert à choisir quoi lire : on écarte les séries mises
  // de côté, sauf quand le lecteur filtre explicitement « En pause ».
  const randomPool = useMemo(
    () =>
      filter === "paused"
        ? filteredItems
        : filteredItems.filter((item) => !isPaused(item)),
    [filter, filteredItems]
  );

  const heroItem = items.find((item) => !isPaused(item)) ?? items[0] ?? null;
  const isFiltering = query.trim() !== "" || filter !== "all";
  const visibleHeroItem =
    heroItem &&
    isFiltering &&
    !filteredItems.some((item) => item.series.id === heroItem.series.id)
      ? null
      : heroItem;
  const showRails = !isFiltering && items.length > 3;
  const resumeItems = useMemo(
    () =>
      filteredItems
        .filter(
          (item) =>
            item.resumeBook &&
            item.remainingBooks > 2 &&
            !isPaused(item) &&
            item.series.id !== visibleHeroItem?.series.id
        )
        .slice(0, 8),
    [filteredItems, visibleHeroItem]
  );
  const almostDoneItems = useMemo(
    () =>
      filteredItems
        .filter(
          (item) =>
            item.remainingBooks <= 2 &&
            !isPaused(item) &&
            item.series.id !== visibleHeroItem?.series.id
        )
        .slice(0, 8),
    [filteredItems, visibleHeroItem]
  );

  const sortOptions: SortMenuOption[] = useMemo(
    () => [
      { value: "recent", label: t("inProgress.sort.recent"), icon: History },
      { value: "progress", label: t("inProgress.sort.progress"), icon: TrendingUp },
      { value: "remaining", label: t("inProgress.sort.remaining"), icon: ListChecks },
      { value: "title", label: t("inProgress.sort.title"), icon: ArrowDownAZ },
    ],
    [t]
  );

  const handleToggleFavorite = useCallback(
    async (item: InProgressItem) => {
      if (isAnonymous) return;

      const nextValue = !favoriteSet.has(item.series.id);
      setFavoriteOverride(item.series.id, nextValue);

      try {
        const result = nextValue
          ? await addToFavorites(item.series.id)
          : await removeFromFavorites(item.series.id);

        if (!result.success) {
          setFavoriteOverride(item.series.id, null);
          toast({
            title: t("inProgress.favorite.error"),
            description: result.message,
            variant: "destructive",
          });
          return;
        }

        window.dispatchEvent(
          new CustomEvent("favoritesChanged", {
            detail: {
              seriesId: item.series.id,
              action: nextValue ? "add" : "remove",
              series: nextValue ? item.series : undefined,
            },
          })
        );
        toast({
          title: t(
            nextValue ? "inProgress.favorite.added" : "inProgress.favorite.removed"
          ),
          description: item.series.name,
        });
        router.refresh();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la modification des favoris:");
        setFavoriteOverride(item.series.id, null);
        toast({
          title: t("inProgress.favorite.error"),
          description: item.series.name,
          variant: "destructive",
        });
      }
    },
    [favoriteSet, isAnonymous, router, setFavoriteOverride, t, toast]
  );

  const handleUnshelve = useCallback(
    async (item: InProgressItem) => {
      if (isAnonymous || !canShelve || shelvingIds.has(item.series.id)) return;

      setShelvingIds((current) => new Set(current).add(item.series.id));
      try {
        const result = await unshelveSeries(item.series.id, item.series.libraryId);
        if (!result.success) {
          toast({
            title: t("inProgress.shelf.error"),
            description: result.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: t("inProgress.shelf.resumed"),
          description: item.series.name,
        });
        router.refresh();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la reprise de la série:");
        toast({
          title: t("inProgress.shelf.error"),
          description: item.series.name,
          variant: "destructive",
        });
      } finally {
        setShelvingIds((current) => {
          const next = new Set(current);
          next.delete(item.series.id);
          return next;
        });
      }
    },
    [canShelve, isAnonymous, router, shelvingIds, t, toast]
  );

  const handleShelve = useCallback(
    async (item: InProgressItem) => {
      if (isAnonymous || !canShelve || shelvingIds.has(item.series.id)) return;

      setShelvingIds((current) => new Set(current).add(item.series.id));
      try {
        const result = await shelveSeries(item.series.id, item.series.libraryId);
        if (!result.success) {
          toast({
            title: t("inProgress.shelf.error"),
            description: result.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: t("inProgress.shelf.shelved"),
          description: item.series.name,
          action: (
            <ToastAction
              altText={t("inProgress.shelf.undo")}
              onClick={() => void handleUnshelve(item)}
            >
              {t("inProgress.shelf.undo")}
            </ToastAction>
          ),
        });
        router.refresh();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la mise de côté de la série:");
        toast({
          title: t("inProgress.shelf.error"),
          description: item.series.name,
          variant: "destructive",
        });
      } finally {
        setShelvingIds((current) => {
          const next = new Set(current);
          next.delete(item.series.id);
          return next;
        });
      }
    },
    [
      canShelve,
      handleUnshelve,
      isAnonymous,
      router,
      shelvingIds,
      t,
      toast,
    ]
  );

  const handleToggleShelf = useCallback(
    (item: InProgressItem) => {
      void (item.series.shelvedAt ? handleUnshelve(item) : handleShelve(item));
    },
    [handleShelve, handleUnshelve]
  );

  const handleDisableAnonymous = useCallback(() => {
    startAnonymousTransition(async () => {
      try {
        await toggleAnonymous();
        router.refresh();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la désactivation du mode anonyme:");
        toast({
          title: t("inProgress.anonymous.error"),
          variant: "destructive",
        });
      }
    });
  }, [router, t, toast, toggleAnonymous]);

  const handleRandomPick = useCallback(() => {
    const pool = randomPool;
    if (pool.length === 0) return;

    const currentIndex = highlightedId
      ? pool.findIndex((item) => item.series.id === highlightedId)
      : -1;
    const nextIndex =
      pool.length > 1 && currentIndex >= 0
        ? (currentIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) %
          pool.length
        : Math.floor(Math.random() * pool.length);
    const chosen = pool[nextIndex];

    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    setHighlightedId(chosen.series.id);
    scrollTimer.current = setTimeout(() => {
      document
        .getElementById(`in-progress-series-${chosen.series.id}`)
        ?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
    }, 60);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 2600);
  }, [highlightedId, randomPool, reduceMotion]);

  const handleReset = useCallback(() => {
    setQuery("");
    setFilter("all");
    setSort(DEFAULT_IN_PROGRESS_SORT);
    setHighlightedId(null);
  }, []);

  return (
    <Container as="main" className="space-y-8 pb-12" data-testid="in-progress-page">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("inProgress.title")}
            </h1>
            <p className="text-muted-foreground">{t("inProgress.description")}</p>
          </div>
        </div>
      </header>

      {isAnonymous ? (
        <InProgressAnonymousState
          onDisable={handleDisableAnonymous}
          isPending={isDisablingAnonymous}
        />
      ) : items.length === 0 ? (
        <InProgressEmptyState />
      ) : (
        <>
          {visibleHeroItem && (
            <InProgressHero
              item={visibleHeroItem}
              isFavorite={favoriteSet.has(visibleHeroItem.series.id)}
              onToggleFavorite={() => void handleToggleFavorite(visibleHeroItem)}
              now={now}
              canShelve={canShelve}
              isShelved={visibleHeroItem.series.shelvedAt != null}
              isShelving={shelvingIds.has(visibleHeroItem.series.id)}
              onToggleShelf={() => handleToggleShelf(visibleHeroItem)}
            />
          )}

          <InProgressStats
            stats={stats}
            filter={filter}
            sort={sort}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />

          {showRails && resumeItems.length > 0 && (
            <InProgressRail
              title={t("inProgress.rails.resume")}
              description={t("inProgress.rails.resumeDescription")}
              icon={BookOpen}
              items={resumeItems}
              now={now}
              testId="in-progress-rail-resume"
            />
          )}

          {showRails && almostDoneItems.length > 0 && (
            <InProgressRail
              title={t("inProgress.rails.almostDone")}
              description={t("inProgress.rails.almostDoneDescription")}
              icon={Flame}
              items={almostDoneItems}
              now={now}
              testId="in-progress-rail-almost-done"
            />
          )}

          <section
            id="in-progress-grid"
            aria-label={t("inProgress.gridTitle")}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 rounded-2xl bg-surface-1 p-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder={t("inProgress.toolbar.search")}
                  aria-label={t("inProgress.toolbar.search")}
                  className="pl-9 pr-9"
                  data-testid="in-progress-search"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-2 top-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                    aria-label={t("inProgress.toolbar.clearSearch")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label={t("inProgress.toolbar.filtersLabel")}
              >
                {FILTERS.map(({ value, icon: Icon, labelKey }) => {
                  const active = filter === value;
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={active ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleFilterChange(value)}
                      aria-pressed={active}
                      data-testid={`in-progress-filter-${value}`}
                      className="h-9 gap-1.5 rounded-full px-3 text-xs font-medium sm:text-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{t(labelKey)}</span>
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <SortMenu
                  value={sort}
                  options={sortOptions}
                  onChange={(value) => handleSortChange(value as InProgressSort)}
                  label={t("inProgress.toolbar.sortLabel")}
                  testId="in-progress-sort"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRandomPick}
                  disabled={randomPool.length === 0}
                  aria-label={t("inProgress.toolbar.random")}
                  title={t("inProgress.toolbar.random")}
                  className="h-9 gap-1.5 rounded-full px-3 text-xs font-medium sm:text-sm"
                  data-testid="in-progress-random"
                >
                  <Shuffle className="h-4 w-4" />
                  <span className="hidden min-[420px]:inline">
                    {t("inProgress.toolbar.random")}
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span data-testid="in-progress-results-count">
                {t("inProgress.results", { count: filteredItems.length })}
              </span>
              {(query.trim() !== "" || filter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 shrink-0 text-xs"
                >
                  {t("inProgress.reset")}
                </Button>
              )}
            </div>

            {filteredItems.length > 0 ? (
              <StaggerGroup
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                reveal="scroll"
                effect="settle"
                stagger={0.06}
                amount={0.08}
              >
                {filteredItems.map((item) => (
                  <StaggerItem key={item.series.id} className="h-full">
                    <InProgressCard
                      item={item}
                      isFavorite={favoriteSet.has(item.series.id)}
                      onToggleFavorite={() => void handleToggleFavorite(item)}
                      now={now}
                      highlighted={highlightedId === item.series.id}
                      canShelve={canShelve}
                      isShelved={item.series.shelvedAt != null}
                      isShelving={shelvingIds.has(item.series.id)}
                      onToggleShelf={() => handleToggleShelf(item)}
                    />
                  </StaggerItem>
                ))}
              </StaggerGroup>
            ) : (
              <InProgressNoResultsState onReset={handleReset} />
            )}
          </section>
        </>
      )}
    </Container>
  );
}
