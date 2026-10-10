"use client";

import { memo, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { History, Sparkles, Clock, LibraryBig, BookOpen, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { loadHomeFeed, type HomeFeed } from "@/app/actions/home";

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
      headerClassName={cn("border-b border-border/50 pb-2", featuredHeader && "border-primary/25")}
      titleClassName={
        featuredHeader
          ? "bg-linear-to-r from-primary via-cyan-500 to-fuchsia-500 bg-clip-text text-transparent"
          : undefined
      }
      iconClassName={featuredHeader ? "text-primary" : undefined}
    >
      <ScrollContainer
        showArrows={true}
        scrollAmount={400}
        arrowLeftLabel={t("navigation.scrollLeft")}
        arrowRightLabel={t("navigation.scrollRight")}
      >
        {loadedItems.map((item) => (
          <MediaCard key={item.id} item={item} onClick={onItemClick} />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="flex min-h-[282px] w-[150px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-foreground sm:min-h-[300px]"
          >
            {isPending ? t("navigation.loading") : t("navigation.loadMore")}
          </button>
        )}
      </ScrollContainer>
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

  return (
    <Card
      onClick={() => onClick(series)}
      className="group relative flex w-[188px] shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md sm:w-[200px] cursor-pointer"
    >
      <div className="relative aspect-2/3 bg-muted overflow-hidden">
        <SeriesCover series={series} alt={`Couverture de ${series.name}`} isAnonymous={isAnonymous} />
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <h3 className="font-medium text-sm text-white line-clamp-2">{series.name}</h3>
          <p className="text-xs text-white/80 mt-1">
            {t("series.books", { count: series.bookCount })}
          </p>
        </div>
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
  const title = book.title || (book.number ? t("navigation.volume", { number: book.number }) : "");

  return (
    <Card
      onClick={() => onClick(book)}
      className="group relative flex w-[188px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md sm:w-[200px]"
    >
      <div className="relative aspect-2/3 bg-muted overflow-hidden">
        <BookCover
          book={book}
          alt={`Couverture de ${title}`}
          showControls={false}
          overlayVariant="home"
        />
      </div>
    </Card>
  );
});
