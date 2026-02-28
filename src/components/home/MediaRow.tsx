"use client";

import { useRouter } from "next/navigation";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { History, Sparkles, Clock, LibraryBig, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { cn } from "@/lib/utils";

interface BaseItem {
  id: string;
  metadata: {
    title: string;
  };
}

interface OptimizedSeries extends BaseItem {
  booksCount: number;
  booksReadCount: number;
}

interface OptimizedBook extends BaseItem {
  readProgress: {
    page: number;
  };
  media: {
    pagesCount: number;
  };
  metadata: {
    title: string;
    number?: string;
  };
}

interface MediaRowProps {
  titleKey: string;
  items: (OptimizedSeries | OptimizedBook)[];
  iconName?: string;
}

const iconMap = {
  LibraryBig,
  BookOpen,
  Clock,
  Sparkles,
  History,
};

export function MediaRow({ titleKey, items, iconName }: MediaRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const icon = iconName ? iconMap[iconName as keyof typeof iconMap] : undefined;

  const onItemClick = (item: OptimizedSeries | OptimizedBook) => {
    const path = "booksCount" in item ? `/series/${item.id}` : `/books/${item.id}`;
    router.push(path);
  };

  if (!items.length) return null;

  return (
    <Section
      title={t(titleKey)}
      icon={icon}
      className="space-y-5"
      headerClassName="border-b border-border/50 pb-2"
    >
      <ScrollContainer
        showArrows={true}
        scrollAmount={400}
        arrowLeftLabel={t("navigation.scrollLeft")}
        arrowRightLabel={t("navigation.scrollRight")}
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onClick={() => onItemClick?.(item)} />
        ))}
      </ScrollContainer>
    </Section>
  );
}

interface MediaCardProps {
  item: OptimizedSeries | OptimizedBook;
  onClick?: () => void;
}

function MediaCard({ item, onClick }: MediaCardProps) {
  const { t } = useTranslate();
  const isSeries = "booksCount" in item;
  const { isAccessible } = useBookOfflineStatus(isSeries ? "" : item.id);

  const title = isSeries
    ? item.metadata.title
    : item.metadata.title ||
      (item.metadata.number ? t("navigation.volume", { number: item.metadata.number }) : "");

  const handleClick = () => {
    // Pour les séries, toujours autoriser le clic
    // Pour les livres, vérifier si accessible
    if (isSeries || isAccessible) {
      onClick?.();
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "relative flex w-[188px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md sm:w-[200px]",
        !isSeries && !isAccessible ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <div className="relative aspect-[2/3] bg-muted">
        {isSeries ? (
          <>
            <SeriesCover series={item as KomgaSeries} alt={`Couverture de ${title}`} />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-200 hover:opacity-100">
                <h3 className="font-medium text-sm text-white line-clamp-2">{title}</h3>
                <p className="text-xs text-white/80 mt-1">
                  {t("series.books", { count: item.booksCount })}
                </p>
            </div>
          </>
        ) : (
          <>
            <BookCover
              book={item as KomgaBook}
              alt={`Couverture de ${title}`}
              showControls={false}
              overlayVariant="home"
            />
          </>
        )}
      </div>
    </Card>
  );
}
