"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, BookOpen, Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { StripstreamReadingList } from "@/types/stripstream";

type ReadingListFilter = "all" | "unread" | "reading" | "read";
type ReadingListStatus = Exclude<ReadingListFilter, "all">;

function getReadingListStatus(list: StripstreamReadingList): ReadingListStatus {
  if (list.book_count > 0 && list.books_read_count >= list.book_count) return "read";
  if (list.books_read_count > 0) return "reading";
  return "unread";
}

interface ReadingListsContentProps {
  lists: StripstreamReadingList[];
  isStripstream: boolean;
}

export function ReadingListsContent({ lists, isStripstream }: ReadingListsContentProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const router = useRouter();
  const [filter, setFilter] = useState<ReadingListFilter>("all");
  const [query, setQuery] = useState("");

  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return lists.filter((list) => {
      const matchesQuery = !normalizedQuery || list.name.toLocaleLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all" || getReadingListStatus(list) === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, lists, query]);

  const filters: { value: ReadingListFilter; icon: typeof Bookmark }[] = [
    { value: "all", icon: Bookmark },
    { value: "unread", icon: BookMarked },
    { value: "reading", icon: BookOpen },
    { value: "read", icon: BookMarked },
  ];

  if (!isStripstream) {
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
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Bookmark className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("home.reading_lists.title")}</h1>
            <p className="text-muted-foreground">{t("home.reading_lists.description")}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/45 p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("home.reading_lists.search")}
            aria-label={t("home.reading_lists.search")}
            data-testid="reading-list-search"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label={t("home.reading_lists.filters.title")}>
          {filters.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={filter === value ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(value)}
              data-testid={`reading-list-filter-${value}`}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {t(`home.reading_lists.filters.${value}`)}
            </Button>
          ))}
        </div>
      </div>

      {filteredLists.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredLists.map((list) => {
            const status = getReadingListStatus(list);
            const isCompleted = !isAnonymous && status === "read";
            const firstCover = list.preview_covers[0];

            return (
              <button
                key={list.id}
                type="button"
                data-testid={`reading-list-card-${list.id}`}
                onClick={() => router.push(`/reading-lists/${list.id}`)}
                className={cn("group flex flex-col gap-2 text-left transition-opacity", isCompleted && "opacity-70")}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  {firstCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/stripstream/images/books/${firstCover}/thumbnail`} alt={list.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center"><BookMarked className="h-12 w-12 text-muted-foreground/40" /></div>
                  )}
                  {!isAnonymous && (
                    <StatusBadge
                      status={status === "read" ? "success" : status === "reading" ? "reading" : "unread"}
                      className="absolute right-2 top-2 border-background/50 bg-background/85 px-1.5 py-0.5 text-[10px] shadow-sm backdrop-blur"
                    >
                      {t(`home.reading_lists.filters.${status}`)}
                    </StatusBadge>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-sm font-semibold text-white">{list.name}</p>
                  </div>
                </div>
                <div className="space-y-0.5 px-0.5">
                  <p className="line-clamp-1 font-medium leading-tight">{list.name}</p>
                  <p className="text-xs text-muted-foreground">{t("home.reading_lists.series_count", { count: list.series_count })}</p>
                  {!isAnonymous && list.book_count > 0 && (
                    <p className="text-xs text-muted-foreground">{t("series.status.progress", { read: list.books_read_count, total: list.book_count })}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
