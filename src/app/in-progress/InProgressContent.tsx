"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowDownAZ,
  BookOpenCheck,
  Flame,
  Heart,
  History,
  Layers,
  ListChecks,
  PauseCircle,
  Shuffle,
  TrendingUp,
} from "lucide-react";
import { CollectionToolbar } from "@/components/common/CollectionToolbar";
import { FilterChips } from "@/components/common/FilterChips";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchField } from "@/components/common/SearchField";
import { SortMenu, type SortMenuOption } from "@/components/common/SortMenu";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useToast } from "@/components/ui/use-toast";
import { useAnonymous } from "@/contexts/AnonymousContext";
import {
  useFavoriteSet,
  useSeriesMutations,
} from "@/contexts/SeriesMutationsContext";
import { useTranslate } from "@/hooks/useTranslate";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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
import {
  InProgressAnonymousState,
  InProgressEmptyState,
  InProgressNoResultsState,
} from "@/components/in-progress/InProgressStates";

interface InProgressContentProps {
  items: InProgressItem[];
  favoriteIds: string[];
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

export function InProgressContent({
  items,
  favoriteIds,
  canShelve = false,
}: InProgressContentProps) {
  const { toast } = useToast();
  const { t } = useTranslate();
  const { isAnonymous, toggleAnonymous } = useAnonymous();
  const mutations = useSeriesMutations();
  const favoriteSet = useFavoriteSet(favoriteIds);
  const reduceMotion = usePrefersReducedMotion();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InProgressFilter>("all");
  const [sort, setSort] = useState<InProgressSort>(DEFAULT_IN_PROGRESS_SORT);
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

  const filterCounts: Record<InProgressFilter, number> = {
    all: stats.total,
    favorites: stats.favorites,
    "almost-done": stats.almostDone,
    paused: stats.paused,
  };

  // Le tirage aléatoire sert à choisir quoi lire : on écarte les séries mises
  // de côté, sauf quand le lecteur filtre explicitement « En pause ».
  const randomPool = useMemo(
    () =>
      filter === "paused"
        ? filteredItems
        : filteredItems.filter((item) => !isPaused(item)),
    [filter, filteredItems]
  );

  const isFiltering = query.trim() !== "" || filter !== "all";

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
    (item: InProgressItem) => {
      if (isAnonymous) return;
      void mutations.toggleFavorite(
        item.series,
        favoriteSet.has(item.series.id)
      );
    },
    [favoriteSet, isAnonymous, mutations]
  );

  const handleToggleShelf = useCallback(
    (item: InProgressItem) => {
      if (isAnonymous || !canShelve) return;
      const currentlyShelved = mutations.isShelved(
        item.series.id,
        item.series.shelvedAt != null
      );
      void mutations.setShelf(item.series, !currentlyShelved, {
        undo: !currentlyShelved,
      });
    },
    [canShelve, isAnonymous, mutations]
  );

  const handleDisableAnonymous = useCallback(() => {
    startAnonymousTransition(async () => {
      try {
        // `toggleAnonymous` rafraîchit la route une fois l'écriture confirmée.
        await toggleAnonymous();
      } catch {
        toast({
          title: t("inProgress.anonymous.error"),
          variant: "destructive",
        });
      }
    });
  }, [t, toast, toggleAnonymous]);

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
      <PageHeader
        icon={BookOpenCheck}
        title={t("inProgress.title")}
        description={t("inProgress.description")}
        meta={
          !isAnonymous && items.length > 0 ? (
            <>
              <span
                className="rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground"
                data-testid="in-progress-results-count"
              >
                {t("inProgress.results", { count: filteredItems.length })}
              </span>
              {isFiltering && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 px-2 text-xs"
                >
                  {t("inProgress.reset")}
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {isAnonymous ? (
        <InProgressAnonymousState
          onDisable={handleDisableAnonymous}
          isPending={isDisablingAnonymous}
        />
      ) : items.length === 0 ? (
        <InProgressEmptyState />
      ) : (
        <section
          id="in-progress-grid"
          aria-label={t("inProgress.gridTitle")}
          className="space-y-5"
        >
          <CollectionToolbar
            search={
              <SearchField
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder={t("inProgress.toolbar.search")}
                aria-label={t("inProgress.toolbar.search")}
                data-testid="in-progress-search"
                onClear={() => handleQueryChange("")}
                clearLabel={t("inProgress.toolbar.clearSearch")}
              />
            }
            filters={
              <FilterChips
                items={FILTERS.map(({ value, icon, labelKey }) => ({
                  value,
                  label: t(labelKey),
                  icon,
                  count: filterCounts[value],
                }))}
                value={filter}
                onChange={handleFilterChange}
                ariaLabel={t("inProgress.toolbar.filtersLabel")}
                testIdPrefix="in-progress-filter"
              />
            }
            sort={
              <SortMenu
                value={sort}
                options={sortOptions}
                onChange={(value) => handleSortChange(value as InProgressSort)}
                label={t("inProgress.toolbar.sortLabel")}
                testId="in-progress-sort"
              />
            }
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRandomPick}
                disabled={randomPool.length === 0}
                aria-label={t("inProgress.toolbar.random")}
                title={t("inProgress.toolbar.random")}
                className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium sm:text-sm"
                data-testid="in-progress-random"
              >
                <Shuffle className="h-4 w-4" />
                <span className="hidden min-[380px]:inline">
                  {t("inProgress.toolbar.random")}
                </span>
              </Button>
            }
          />

          {filteredItems.length > 0 ? (
            <StaggerGroup
              className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              reveal="scroll"
              effect="settle"
              stagger={0.09}
              amount={0.08}
            >
              {filteredItems.map((item) => (
                <StaggerItem key={item.series.id} className="h-full">
                  <InProgressCard
                    item={item}
                    isFavorite={favoriteSet.has(item.series.id)}
                    onToggleFavorite={() => void handleToggleFavorite(item)}
                    highlighted={highlightedId === item.series.id}
                    canShelve={canShelve}
                    isShelved={mutations.isShelved(
                      item.series.id,
                      item.series.shelvedAt != null
                    )}
                    isShelving={mutations.isShelfPending(item.series.id)}
                    onToggleShelf={() => handleToggleShelf(item)}
                  />
                </StaggerItem>
              ))}
            </StaggerGroup>
          ) : (
            <InProgressNoResultsState onReset={handleReset} />
          )}
        </section>
      )}
    </Container>
  );
}
