"use client";

import { Input } from "@/components/ui/input";
import { Search, BookOpen, Library } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { getImageUrl } from "@/lib/utils/image-url";

interface SearchSeriesResult {
  id: string;
  title: string;
  href: string;
  booksCount: number;
}

interface SearchBookResult {
  id: string;
  title: string;
  seriesTitle: string;
  href: string;
}

interface SearchResponse {
  series: SearchSeriesResult[];
  books: SearchBookResult[];
}

const MIN_QUERY_LENGTH = 2;

export function GlobalSearch() {
  const { t } = useTranslate();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>({ series: [], books: [] });

  const hasResults = results.series.length > 0 || results.books.length > 0;

  const firstResultHref = useMemo(() => {
    if (results.series.length > 0) {
      return results.series[0].href;
    }

    if (results.books.length > 0) {
      return results.books[0].href;
    }

    return null;
  }, [results.books, results.series]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults({ series: [], books: [] });
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);

        const response = await fetch(`/api/komga/search?q=${encodeURIComponent(trimmedQuery)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = (await response.json()) as SearchResponse;
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults({ series: [], books: [] });
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (firstResultHref) {
      setIsOpen(false);
      router.push(firstResultHref);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={t("header.search.placeholder")}
          aria-label={t("header.search.placeholder")}
          className="h-10 rounded-full border-border/60 bg-background/65 pl-10 pr-10 text-sm shadow-sm focus-visible:ring-primary/40"
        />
        {isLoading && (
          <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </form>

      {isOpen && query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-xl backdrop-blur-xl">
          <div className="max-h-[26rem] overflow-y-auto p-2">
            {results.series.length > 0 && (
              <div className="mb-2">
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("header.search.series")}
                </div>
                {results.series.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                    aria-label={t("header.search.openSeries", { title: item.title })}
                  >
                    <img
                      src={getImageUrl("series", item.id)}
                      alt={item.title}
                      loading="lazy"
                      className="h-14 w-10 rounded object-cover bg-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <Library className="h-3 w-3" />
                        {t("series.books", { count: item.booksCount })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {results.books.length > 0 && (
              <div>
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("header.search.books")}
                </div>
                {results.books.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                    aria-label={t("header.search.openBook", { title: item.title })}
                  >
                    <img
                      src={getImageUrl("book", item.id)}
                      alt={item.title}
                      loading="lazy"
                      className="h-14 w-10 rounded object-cover bg-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span className="truncate">{item.seriesTitle}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!isLoading && !hasResults && (
              <p className="px-3 py-4 text-sm text-muted-foreground">{t("header.search.empty")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
