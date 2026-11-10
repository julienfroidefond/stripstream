"use client";

import { memo, useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { LoadMoreLabel } from "@/components/ui/load-more-label";
import { Section } from "@/components/ui/section";
import { History, Sparkles, Clock, LibraryBig, BookOpen, Heart } from "lucide-react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { Button } from "@/components/ui/button";
import { CarouselViewToggle } from "@/components/ui/carousel-view-toggle";
import { SpotlightCarousel } from "@/components/ui/spotlight-carousel";
import { SeriesSpotlightSlide } from "@/components/ui/series-spotlight-slide";
import { BookSpotlightSlide } from "@/components/ui/book-spotlight-slide";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useCarouselViewMode } from "@/hooks/useCarouselViewMode";
import { loadHomeFeed, type HomeFeed } from "@/app/actions/home";
import { GlowLayer, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";

const ITEMS_PER_PAGE = 8;

interface MediaRowProps {
  titleKey: string;
  items: (NormalizedSeries | NormalizedBook)[];
  iconName?: string;
  featuredHeader?: boolean;
  testId?: string;
  feed: HomeFeed;
}

const iconMap = {
  LibraryBig,
  BookOpen,
  Clock,
  Sparkles,
  History,
  Heart,
};

function isSeries(item: NormalizedSeries | NormalizedBook): item is NormalizedSeries {
  return "bookCount" in item;
}

export function MediaRow({ titleKey, items, iconName, featuredHeader = false, testId, feed }: MediaRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const [loadedItems, setLoadedItems] = useState(items.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(items.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  const { viewMode, toggleViewMode } = useCarouselViewMode(`home-${feed}-view-mode`);
  const icon = iconName ? iconMap[iconName as keyof typeof iconMap] : undefined;
  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadHomeFeed(feed, loadedItems.length);
      setLoadedItems(result.items as (NormalizedSeries | NormalizedBook)[]);
      setHasMore(result.hasMore);
    });
  };

  const onItemClick = useCallback(
    (item: NormalizedSeries | NormalizedBook) => {
      const path = isSeries(item) ? `/series/${item.id}` : `/books/${item.id}`;
      router.push(path);
    },
    [router]
  );

  if (!items.length) return null;

  return (
    <Section
      data-testid={testId}
      title={t(titleKey)}
      icon={icon}
      className="space-y-5"
      headerClassName="pb-1"
      titleClassName={featuredHeader ? "text-primary" : undefined}
      iconClassName={featuredHeader ? "text-primary" : undefined}
      actions={<CarouselViewToggle viewMode={viewMode} onToggle={toggleViewMode} />}
    >
      {viewMode === "spotlight" ? (
        <SpotlightCarousel
          ariaLabel={t(titleKey)}
          slides={loadedItems.map((item) => ({
            key: item.id,
            backdropSrc: item.thumbnailUrl,
            content: isSeries(item) ? (
              <SeriesSpotlightSlide
                series={item}
                onOpen={() => onItemClick(item)}
                ctaLabel={t("navigation.viewSeries")}
                eyebrow={t("navigation.seriesLabel")}
              />
            ) : (
              <BookSpotlightSlide
                book={item}
                onOpen={() => onItemClick(item)}
                eyebrow={t("navigation.bookLabel")}
              />
            ),
          }))}
          footer={
            hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isPending}
                aria-busy={isPending}
                className="disabled:opacity-100"
              >
                <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
              </Button>
            ) : undefined
          }
        />
      ) : (
        <StaggerGroup stagger={0.05} effect="deal" amount={0.25}>
          <ScrollContainer
            showArrows={true}
            scrollAmount={400}
            arrowLeftLabel={t("navigation.scrollLeft")}
            arrowRightLabel={t("navigation.scrollRight")}
          >
            {loadedItems.map((item) => (
              <StaggerItem key={item.id} className="shrink-0">
                <MediaCard item={item} />
              </StaggerItem>
            ))}
            {hasMore && (
              <StaggerItem className="shrink-0">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
                >
                  <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
                </button>
              </StaggerItem>
            )}
          </ScrollContainer>
        </StaggerGroup>
      )}
    </Section>
  );
}

interface MediaCardProps {
  item: NormalizedSeries | NormalizedBook;
}

const MediaCard = memo(function MediaCard({ item }: MediaCardProps) {
  return isSeries(item) ? (
    <SeriesMediaCard series={item} />
  ) : (
    <BookMediaCard book={item} />
  );
});

const SeriesMediaCard = memo(function SeriesMediaCard({
  series,
}: {
  series: NormalizedSeries;
}) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const cardRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(cardRef);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleGlow}
      className="group relative w-[188px] sm:w-[200px]"
    >
      <BookCoverScene
        href={`/series/${series.id}`}
        ariaLabel={t("home.coverLinkSeries", { title: series.name })}
        contained
        className="w-full"
        linkClassName="focus-visible:outline-hidden"
        cover={
          <>
            <SeriesCover
              series={series}
              alt={t("series.coverAlt", { title: series.name })}
              isAnonymous={isAnonymous}
            />
            <GlowLayer />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-[2px_6px_6px_2px] ring-1 ring-inset ring-border/60"
            />
          </>
        }
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 rounded-[2px_6px_6px_2px] opacity-0 ring-2 ring-ring ring-offset-2 ring-offset-background transition-opacity duration-150 group-focus-within:opacity-100"
      />
    </div>
  );
});

const BookMediaCard = memo(function BookMediaCard({ book }: { book: NormalizedBook }) {
  const { t } = useTranslate();
  const glowRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(glowRef);
  const title =
    book.title ||
    (book.number ? t("navigation.volume", { number: book.number }) : t("books.defaultCoverAlt"));

  return (
    <div
      ref={glowRef}
      onMouseMove={handleGlow}
      className="group relative w-[188px] sm:w-[200px]"
    >
      <BookCoverScene
        href={`/books/${book.id}`}
        ariaLabel={t("home.coverLinkBook", { title })}
        contained
        className="w-full"
        linkClassName="focus-visible:outline-hidden"
        cover={
          <>
            <BookCover
              book={book}
              alt={t("books.coverAlt", { title })}
              showControls={false}
              showOverlay={false}
            />
            <GlowLayer />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-[2px_6px_6px_2px] ring-1 ring-inset ring-border/60"
            />
          </>
        }
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 rounded-[2px_6px_6px_2px] opacity-0 ring-2 ring-ring ring-offset-2 ring-offset-background transition-opacity duration-150 group-focus-within:opacity-100"
      />
    </div>
  );
});
