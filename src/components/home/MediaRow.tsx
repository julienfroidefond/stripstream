"use client";

import { memo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { History, Sparkles, Clock, LibraryBig, BookOpen, Heart } from "lucide-react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { SeriesSpotlightSlide } from "@/components/ui/series-spotlight-slide";
import { BookSpotlightSlide } from "@/components/ui/book-spotlight-slide";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { FeedRow } from "@/components/home/FeedRow";
import type { HomeFeed, HomeFeedItem } from "@/lib/home/feed-page";
import { GlowLayer, usePointerGlow } from "@/components/motion";

type MediaFeed = Extract<
  HomeFeed,
  "ongoing" | "favorites" | "latest-series" | "recently-read"
>;

interface MediaRowProps {
  titleKey: string;
  items: HomeFeedItem<MediaFeed>[];
  initialHasMore?: boolean;
  iconName?: string;
  featuredHeader?: boolean;
  testId?: string;
  feed: MediaFeed;
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

export function MediaRow({ titleKey, items, initialHasMore, iconName, featuredHeader = false, testId, feed }: MediaRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const icon = iconName ? iconMap[iconName as keyof typeof iconMap] : undefined;

  const onItemClick = useCallback(
    (item: NormalizedSeries | NormalizedBook) => {
      router.push(isSeries(item) ? `/series/${item.id}` : `/books/${item.id}`);
    },
    [router]
  );

  return (
    <FeedRow
      titleKey={titleKey}
      icon={icon}
      initialItems={items}
      initialHasMore={initialHasMore}
      feed={feed}
      testId={testId}
      featuredHeader={featuredHeader}
      viewModeKey={`home-${feed}-view-mode`}
      getKey={(item) => item.id}
      renderCard={(item) => <MediaCard item={item} />}
      renderSlide={(item) => ({
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
      })}
    />
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
