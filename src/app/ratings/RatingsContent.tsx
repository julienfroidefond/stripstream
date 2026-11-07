"use client";

import Link from "next/link";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  History,
  Search,
  Sparkles,
  Star,
  StarOff,
} from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { SortMenu, type SortMenuOption } from "@/components/common/SortMenu";
import { SeriesRatingControl } from "@/components/series/SeriesRatingControl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { SeriesCover } from "@/components/ui/series-cover";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedSeries } from "@/lib/providers/types";
import {
  DEFAULT_READ_SERIES_SORT,
  type ReadSeriesCounts,
  type ReadSeriesFilter,
  type ReadSeriesSort,
} from "@/lib/services/read-series.service";

interface RatingsContentProps {
  /** Séries de la page courante uniquement : le filtrage et le tri sont faits côté serveur. */
  series: NormalizedSeries[];
  counts: ReadSeriesCounts;
  query: string;
  filter: ReadSeriesFilter;
  sort: ReadSeriesSort;
  page: number;
  totalPages: number;
}

export function RatingsContent({
  series,
  counts,
  query,
  filter,
  sort,
  page,
  totalPages,
}: RatingsContentProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filters: { value: ReadSeriesFilter; icon: typeof Star }[] = [
    { value: "all", icon: Star },
    { value: "unrated", icon: StarOff },
    { value: "rated", icon: Sparkles },
  ];

  const sortOptions: SortMenuOption[] = [
    { value: "to-rate", label: t("ratings.sort.toRate"), icon: StarOff },
    { value: "recent", label: t("ratings.sort.recent"), icon: History },
    { value: "rating-desc", label: t("ratings.sort.ratingDesc"), icon: ArrowDownWideNarrow },
    { value: "rating-asc", label: t("ratings.sort.ratingAsc"), icon: ArrowUpNarrowWide },
    { value: "title", label: t("ratings.sort.title"), icon: ArrowDownAZ },
  ];

  /** L'URL porte l'état : filtre, tri et pagination sont des navigations serveur. */
  const buildHref = (
    nextFilter: ReadSeriesFilter,
    nextPage = 1,
    nextSort: ReadSeriesSort = sort
  ) => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    if (nextSort !== DEFAULT_READ_SERIES_SORT) params.set("sort", nextSort);
    if (nextPage > 1) params.set("page", String(nextPage));

    const search = params.toString();
    return search ? `/ratings?${search}` : "/ratings";
  };

  const handleSortChange = (nextSort: string) => {
    startTransition(() => {
      router.push(buildHref(filter, 1, nextSort as ReadSeriesSort));
    });
  };

  return (
    <Container as="main" className="space-y-8" data-testid="ratings-page" aria-busy={isPending}>
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("ratings.title")}</h1>
            <p className="text-muted-foreground">{t("ratings.description")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground">
            {t("ratings.summary.total", { count: counts.total })}
          </span>
          {counts.unrated > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">
              {t("ratings.summary.unrated", { count: counts.unrated })}
            </span>
          )}
          {counts.rated > 0 && (
            <span className="rounded-full border border-border px-2.5 py-0.5 font-semibold text-muted-foreground">
              {t("ratings.summary.rated", { count: counts.rated })}
            </span>
          )}
        </div>
      </header>

      {isAnonymous && (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("ratings.anonymous")}
        </p>
      )}

      {counts.total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-1 p-3 sm:flex-row sm:items-center">
          <Form action="/ratings" role="search" className="relative flex-1">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            {sort !== DEFAULT_READ_SERIES_SORT && (
              <input type="hidden" name="sort" value={sort} />
            )}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={query}
              name="q"
              defaultValue={query}
              placeholder={t("ratings.search")}
              aria-label={t("ratings.search")}
              data-testid="ratings-search"
              className="pl-9"
            />
            <button type="submit" className="sr-only">
              {t("ratings.searchAction")}
            </button>
          </Form>

          <div className="flex flex-wrap items-center gap-1.5">
            <nav
              className="flex flex-wrap gap-1.5"
              aria-label={t("ratings.filters.title")}
            >
              {filters.map(({ value, icon: Icon }) => (
                <Button
                  key={value}
                  asChild
                  variant={filter === value ? "default" : "ghost"}
                  size="sm"
                >
                  <Link
                    href={buildHref(value)}
                    aria-current={filter === value ? "page" : undefined}
                    data-testid={`ratings-filter-${value}`}
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {t(`ratings.filters.${value}`)}
                  </Link>
                </Button>
              ))}
            </nav>

            <SortMenu
              value={sort}
              options={sortOptions}
              onChange={handleSortChange}
              label={t("ratings.sort.label")}
              testId="ratings-sort"
            />
          </div>
        </div>
      )}

      {series.length > 0 ? (
        <StaggerGroup
          className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          reveal="scroll"
          effect="settle"
          stagger={0.09}
        >
          {series.map((item) => (
            <StaggerItem key={item.id}>
              <article className="flex h-full flex-col gap-2" data-testid={`rated-series-${item.id}`}>
                <Link
                  href={`/series/${item.id}`}
                  className="group relative block aspect-2/3 overflow-hidden rounded-xl bg-surface-2"
                >
                  <SeriesCover
                    series={item}
                    alt={t("series.coverAlt", { title: item.name })}
                    isAnonymous={isAnonymous}
                    dimCompleted={false}
                  />
                  {!isAnonymous && item.userRating == null && (
                    <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                      {t("ratings.filters.unrated")}
                    </span>
                  )}
                </Link>

                <div className="space-y-0.5 px-0.5">
                  <Link
                    href={`/series/${item.id}`}
                    className="line-clamp-1 font-medium leading-tight transition-colors hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.bookCount === 1
                      ? t("series.header.books", { count: item.bookCount })
                      : t("series.header.books_plural", { count: item.bookCount })}
                  </p>
                </div>

                <div className="mt-auto px-0.5">
                  {isAnonymous ? (
                    <p className="text-xs text-muted-foreground">{t("ratings.anonymousShort")}</p>
                  ) : (
                    <SeriesRatingControl
                      seriesId={item.id}
                      initialRating={item.userRating ?? null}
                      providerRatings={[]}
                      tone="surface"
                    />
                  )}
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      ) : (
        <div
          data-testid={counts.total > 0 ? "ratings-no-results" : "ratings-empty"}
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center"
        >
          {counts.total > 0 ? (
            <Search className="h-8 w-8 text-muted-foreground/60" />
          ) : (
            <Star className="h-8 w-8 text-muted-foreground/60" />
          )}
          <div className="space-y-1">
            <h2 className="font-semibold">
              {t(counts.total > 0 ? "ratings.noResults" : "ratings.empty")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(counts.total > 0 ? "ratings.noResultsHint" : "ratings.emptyHint")}
            </p>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3"
          aria-label={t("ratings.pagination.title")}
        >
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(filter, page - 1)} rel="prev">
                {t("ratings.pagination.previous")}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {t("ratings.pagination.previous")}
            </Button>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("ratings.pagination.status", { page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(filter, page + 1)} rel="next">
                {t("ratings.pagination.next")}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {t("ratings.pagination.next")}
            </Button>
          )}
        </nav>
      )}
    </Container>
  );
}
