"use client";

import { useRouter } from "next/navigation";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { BookCover } from "../ui/book-cover";
import { SeriesCover } from "../ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { History, Sparkles, Clock, LibraryBig, BookOpen, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBookOfflineStatus } from "@/hooks/useBookOfflineStatus";
import { cn } from "@/lib/utils";
import { useAnonymous } from "@/contexts/AnonymousContext";

interface MediaRowProps {
  titleKey: string;
  items: (NormalizedSeries | NormalizedBook)[];
  iconName?: string;
  featuredHeader?: boolean;
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

export function MediaRow({ titleKey, items, iconName, featuredHeader = false }: MediaRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const icon = iconName ? iconMap[iconName as keyof typeof iconMap] : undefined;

  const onItemClick = (item: NormalizedSeries | NormalizedBook) => {
    const path = isSeries(item) ? `/series/${item.id}` : `/books/${item.id}`;
    router.push(path);
  };

  if (!items.length) return null;

  return (
    <Section
      title={t(titleKey)}
      icon={icon}
      className="space-y-5"
      headerClassName={cn("border-b border-border/50 pb-2", featuredHeader && "border-primary/25")}
      titleClassName={
        featuredHeader
          ? "bg-gradient-to-r from-primary via-cyan-500 to-fuchsia-500 bg-clip-text text-transparent"
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
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onClick={() => onItemClick?.(item)} />
        ))}
      </ScrollContainer>
    </Section>
  );
}

interface MediaCardProps {
  item: NormalizedSeries | NormalizedBook;
  onClick?: () => void;
}

function MediaCard({ item, onClick }: MediaCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const isSeriesItem = isSeries(item);
  const { isAccessible } = useBookOfflineStatus(isSeriesItem ? "" : item.id);

  const title = isSeriesItem
    ? item.name
    : item.title ||
      (item.number ? t("navigation.volume", { number: item.number }) : "");

  const handleClick = () => {
    // Pour les séries, toujours autoriser le clic
    // Pour les livres, vérifier si accessible
    if (isSeriesItem || isAccessible) {
      onClick?.();
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "group relative flex w-[188px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md sm:w-[200px]",
        !isSeriesItem && !isAccessible ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {isSeriesItem ? (
          <>
            <SeriesCover series={item} alt={`Couverture de ${title}`} isAnonymous={isAnonymous} />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <h3 className="font-medium text-sm text-white line-clamp-2">{title}</h3>
              <p className="text-xs text-white/80 mt-1">
                {t("series.books", { count: item.bookCount })}
              </p>
            </div>
          </>
        ) : (
          <>
            <BookCover
              book={item}
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
