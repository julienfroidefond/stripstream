"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  BookMarked,
  BookOpen,
  Bookmark,
  CalendarPlus,
  History,
  Search,
  TrendingUp,
} from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { CollectionToolbar } from "@/components/common/CollectionToolbar";
import { FilterChips } from "@/components/common/FilterChips";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchField } from "@/components/common/SearchField";
import { SortMenu, type SortMenuOption } from "@/components/common/SortMenu";
import { Container } from "@/components/ui/container";
import { ReadingListCard } from "@/components/reading-lists/ReadingListCard";
import { useTranslate } from "@/hooks/useTranslate";
import {
  DEFAULT_READING_LIST_SORT,
  getReadingListStatus,
  sortReadingLists,
  type ReadingListSort,
  type ReadingListStatus,
} from "@/lib/services/reading-lists.service";
import type { NormalizedReadingList } from "@/lib/providers/types";

type ReadingListFilter = "all" | ReadingListStatus;

interface ReadingListsContentProps {
  lists: NormalizedReadingList[];
  available: boolean;
}

export function ReadingListsContent({ lists, available }: ReadingListsContentProps) {
  const { t } = useTranslate();
  const [filter, setFilter] = useState<ReadingListFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ReadingListSort>(DEFAULT_READING_LIST_SORT);

  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    const matchingLists = lists.filter((list) => {
      const matchesQuery = !normalizedQuery || list.name.toLocaleLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all" || getReadingListStatus(list) === filter;
      return matchesQuery && matchesFilter;
    });

    return sortReadingLists(matchingLists, sort);
  }, [filter, lists, query, sort]);

  const filters: { value: ReadingListFilter; icon: typeof Bookmark }[] = [
    { value: "all", icon: Bookmark },
    { value: "unread", icon: BookMarked },
    { value: "reading", icon: BookOpen },
    { value: "read", icon: BookMarked },
  ];

  const sortOptions: SortMenuOption[] = [
    { value: "updated", label: t("home.reading_lists.sort.updated"), icon: History },
    { value: "created", label: t("home.reading_lists.sort.created"), icon: CalendarPlus },
    { value: "name", label: t("home.reading_lists.sort.name"), icon: ArrowDownAZ },
    { value: "progress", label: t("home.reading_lists.sort.progress"), icon: TrendingUp },
  ];

  if (!available) {
    return (
      <Container as="main" className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl bg-muted p-4"><Bookmark className="h-9 w-9 text-muted-foreground" /></div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("home.reading_lists.title")}</h1>
          <p className="max-w-md text-muted-foreground">{t("home.reading_lists.unavailable")}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container as="main" className="space-y-8" data-testid="reading-lists-page">
      <PageHeader
        icon={Bookmark}
        title={t("home.reading_lists.title")}
        description={t("home.reading_lists.description")}
      />

      <CollectionToolbar
        search={
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("home.reading_lists.search")}
            aria-label={t("home.reading_lists.search")}
            data-testid="reading-list-search"
          />
        }
        filters={
          <FilterChips
            items={filters.map(({ value, icon }) => ({
              value,
              label: t(`home.reading_lists.filters.${value}`),
              icon,
            }))}
            value={filter}
            onChange={(value) => setFilter(value)}
            ariaLabel={t("home.reading_lists.filters.title")}
            testIdPrefix="reading-list-filter"
          />
        }
        sort={
          <SortMenu
            value={sort}
            options={sortOptions}
            onChange={(value) => setSort(value as ReadingListSort)}
            label={t("home.reading_lists.sort.label")}
            testId="reading-list-sort"
          />
        }
      />

      {filteredLists.length ? (
        <StaggerGroup
          className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          reveal="scroll"
          effect="settle"
          stagger={0.09}
        >
          {filteredLists.map((list) => (
            <StaggerItem key={list.id}>
              <ReadingListCard list={list} status={getReadingListStatus(list)} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      ) : (
        <div data-testid="reading-list-filter-empty" className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/60" />
          <div className="space-y-1">
            <h2 className="font-semibold">{t("home.reading_lists.no_results")}</h2>
            <p className="text-sm text-muted-foreground">{t("home.reading_lists.no_results_hint")}</p>
          </div>
        </div>
      )}
    </Container>
  );
}
