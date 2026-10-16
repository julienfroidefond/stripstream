"use client";

import { memo, useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { History, Sparkles, Clock, LibraryBig, BookOpen, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAnonymous } from "@/contexts/AnonymousContext";
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
    >
      <StaggerGroup stagger={0.08} effect="deal" amount={0.25}>
        <ScrollContainer
          showArrows={true}
          scrollAmount={400}
          arrowLeftLabel={t("navigation.scrollLeft")}
          arrowRightLabel={t("navigation.scrollRight")}
        >
          {loadedItems.map((item) => (
            <StaggerItem key={item.id} className="shrink-0">
              <MediaCard item={item} onClick={onItemClick} />
            </StaggerItem>
          ))}
          {hasMore && (
            <StaggerItem className="shrink-0">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isPending}
                className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
              >
                {isPending ? t("navigation.loading") : t("navigation.loadMore")}
              </button>
            </StaggerItem>
          )}
        </ScrollContainer>
      </StaggerGroup>
    </Section>
  );
}

interface MediaCardProps {
  item: NormalizedSeries | NormalizedBook;
  onClick: (item: NormalizedSeries | NormalizedBook) => void;
}

const MediaCard = memo(function MediaCard({ item, onClick }: MediaCardProps) {
  return isSeries(item) ? (
    <SeriesMediaCard series={item} onClick={onClick} />
  ) : (
    <BookMediaCard book={item} onClick={onClick} />
  );
});

const SeriesMediaCard = memo(function SeriesMediaCard({
  series,
  onClick,
}: {
  series: NormalizedSeries;
  onClick: (item: NormalizedSeries | NormalizedBook) => void;
}) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const cardRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(cardRef);

  return (
    <Card
      ref={cardRef}
      onMouseMove={handleGlow}
      onClick={() => onClick(series)}
      className="group relative flex w-[188px] cursor-pointer flex-col overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection hover:-translate-y-2 hover:ring-border sm:w-[200px] motion-reduce:transition-none"
    >
      <div className="relative aspect-2/3 overflow-hidden bg-surface-2">
        <div className="absolute inset-0 transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none">
          <SeriesCover
            series={series}
            alt={`Couverture de ${series.name}`}
            isAnonymous={isAnonymous}
          />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
          <h3 className="font-display text-sm font-medium text-white line-clamp-2">{series.name}</h3>
          <p className="text-xs text-white/80 mt-1">
            {t("series.books", { count: series.bookCount })}
          </p>
        </div>
        <GlowLayer />
      </div>
    </Card>
  );
});

const BookMediaCard = memo(function BookMediaCard({
  book,
  onClick,
}: {
  book: NormalizedBook;
  onClick: (item: NormalizedSeries | NormalizedBook) => void;
}) {
  const { t } = useTranslate();
  const glowRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(glowRef);
  const title = book.title || (book.number ? t("navigation.volume", { number: book.number }) : "");

  return (
    <Card
      ref={glowRef}
      onMouseMove={handleGlow}
      onClick={() => onClick(book)}
      className="group relative flex w-[188px] cursor-pointer flex-col overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection hover:-translate-y-2 hover:ring-border sm:w-[200px] motion-reduce:transition-none"
    >
      <div className="relative aspect-2/3 overflow-hidden bg-surface-2">
        <div className="absolute inset-0 transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none">
          <BookCover
            book={book}
            alt={`Couverture de ${title}`}
            showControls={false}
            overlayVariant="home"
          />
        </div>
        <GlowLayer />
      </div>
    </Card>
  );
});
