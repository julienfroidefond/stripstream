"use client";

import { Input } from "@/components/ui/input";
import { Search, BookOpen, Library } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedSearchResult } from "@/lib/providers/types";
import { usePresence } from "@/components/motion";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/gsap";

const MIN_QUERY_LENGTH = 2;

export function GlobalSearch() {
  const { t } = useTranslate();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<NormalizedSearchResult[]>([]);

  const seriesResults = results.filter((r) => r.type === "series");
  const bookResults = results.filter((r) => r.type === "book");
  const hasResults = results.length > 0;

  const firstResultHref = useMemo(() => {
    return results[0]?.href ?? null;
  }, [results]);

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
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);

        const response = await fetch(`/api/provider/search?q=${encodeURIComponent(trimmedQuery)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = (await response.json()) as NormalizedSearchResult[];
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  const panelOpen = isOpen && query.trim().length >= MIN_QUERY_LENGTH;

  /**
   * Même langage que le reste du site : le panneau bascule vers le
   * spectateur depuis le champ, puis se replie vite à la fermeture.
   */
  const panelRendered = usePresence(panelOpen, panelRef, {
    enter: (timeline, panel, still) => {
      timeline.fromTo(
        panel,
        still
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: -10,
              rotateX: -16,
              scale: 0.97,
              transformPerspective: 900,
              transformOrigin: "50% 0%",
            },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: still ? 0.15 : 0.38, ease: "back.out(1.6)" }
      );
    },
    exit: (timeline, panel, still) => {
      timeline.to(
        panel,
        still
          ? { opacity: 0, duration: 0.12 }
          : { opacity: 0, y: -6, scale: 0.98, duration: 0.16, ease: "power2.in" }
      );
    },
  });

  // À chaque nouvelle liste : les lignes remontent en cascade et les covers
  // arrivent du fond en pivotant, comme les rails de l'accueil.
  useGsapEffect(
    () => {
      const panel = panelRef.current;
      if (!panel || !panelRendered || prefersReducedMotion()) return;
      const rows = panel.querySelectorAll<HTMLElement>("[data-search-row]");
      const covers = panel.querySelectorAll<HTMLElement>("[data-search-cover]");
      if (rows.length === 0) return;
      const timeline = gsap.timeline({ defaults: { ease: "projection" } });
      timeline
        .fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.035 }, 0)
        .fromTo(
          covers,
          { opacity: 0, x: -10, rotateY: -55, transformPerspective: 500 },
          { opacity: 1, x: 0, rotateY: 0, duration: 0.45, stagger: 0.035, ease: "back.out(1.8)" },
          0.04
        );
      return () => {
        timeline.kill();
        gsap.set([...rows, ...covers], { clearProps: "opacity,transform" });
      };
    },
    { dependencies: [results, panelRendered] }
  );

  // Pendant la requête, la loupe balaie en petits cercles : elle cherche.
  useGsapEffect(
    () => {
      const icon = iconRef.current;
      if (!icon || !isLoading || prefersReducedMotion()) return;
      const sweep = { angle: 0 };
      const tween = gsap.to(sweep, {
        angle: Math.PI * 2,
        duration: 0.7,
        ease: "none",
        repeat: -1,
        onUpdate: () => {
          gsap.set(icon, { x: Math.cos(sweep.angle) * 2.5, y: Math.sin(sweep.angle) * 2.5 });
        },
      });
      return () => {
        tween.kill();
        gsap.to(icon, { x: 0, y: 0, duration: 0.3, ease: "back.out(2)" });
      };
    },
    { dependencies: [isLoading] }
  );

  /** Au focus, la loupe fait un petit bond et prend la couleur de l'accent. */
  const popIcon = () => {
    const icon = iconRef.current;
    if (!icon || prefersReducedMotion()) return;
    gsap.fromTo(
      icon,
      { rotate: -24, scale: 1.25 },
      { rotate: 0, scale: 1, duration: 0.5, ease: "back.out(3)", overwrite: "auto" }
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (firstResultHref) {
      setIsOpen(false);
      router.push(firstResultHref);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="group/search" aria-busy={isLoading}>
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
          <Search
            ref={iconRef}
            className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary"
          />
        </span>
        <Input
          type="search"
          value={query}
          onFocus={() => {
            popIcon();
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
          className="h-10 rounded-full border-border bg-surface-1 pl-10 pr-10 text-sm focus-visible:ring-primary/40"
        />
      </form>

      {panelRendered && (
        <div ref={panelRef} className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">{/* taste-skill-ignore: panneau déroulant (overlay) */}
          <div className="max-h-[26rem] overflow-y-auto p-2">
            {seriesResults.length > 0 && (
              <div className="mb-2">
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("header.search.series")}
                </div>
                {seriesResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    data-search-row
                    className="group/row flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                    aria-label={t("header.search.openSeries", { title: item.title })}
                  >
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      loading="lazy"
                      data-search-cover
                      className="h-14 w-10 shrink-0 rounded object-cover bg-muted transition-[rotate,scale] duration-300 ease-out group-hover/row:-rotate-3 group-hover/row:scale-108 motion-reduce:transition-none"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <Library className="h-3 w-3" />
                        {item.bookCount !== undefined && t("series.books", { count: item.bookCount })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {bookResults.length > 0 && (
              <div>
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("header.search.books")}
                </div>
                {bookResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    data-search-row
                    className="group/row flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                    aria-label={t("header.search.openBook", { title: item.title })}
                  >
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      loading="lazy"
                      data-search-cover
                      className="h-14 w-10 shrink-0 rounded object-cover bg-muted transition-[rotate,scale] duration-300 ease-out group-hover/row:-rotate-3 group-hover/row:scale-108 motion-reduce:transition-none"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
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
              <p data-search-row className="px-3 py-4 text-sm text-muted-foreground">
                {t("header.search.empty")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
