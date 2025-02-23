"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Cover } from "@/components/ui/cover";
import { useRouter } from "next/navigation";

interface BaseItem {
  id: string;
  metadata: {
    title: string;
  };
}

interface OptimizedSeries extends BaseItem {
  booksCount: number;
}

interface OptimizedBook extends BaseItem {
  metadata: {
    title: string;
    number?: string;
  };
}

interface MediaRowProps {
  title: string;
  items: (OptimizedSeries | OptimizedBook)[];
  icon?: React.ReactNode;
}

export function MediaRow({ title, items, icon }: MediaRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const router = useRouter();

  const onItemClick = (item: OptimizedSeries | OptimizedBook) => {
    const path = "booksCount" in item ? `/series/${item.id}` : `/books/${item.id}`;
    router.push(path);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = direction === "left" ? -400 : 400;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="relative">
        {/* Bouton de défilement gauche */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/90 shadow-md border transition-opacity"
            aria-label="Défiler vers la gauche"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Conteneur défilant */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        >
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onClick={() => onItemClick?.(item)} />
          ))}
        </div>

        {/* Bouton de défilement droit */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/90 shadow-md border transition-opacity"
            aria-label="Défiler vers la droite"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}

interface MediaCardProps {
  item: OptimizedSeries | OptimizedBook;
  onClick?: () => void;
}

function MediaCard({ item, onClick }: MediaCardProps) {
  const isSeries = "booksCount" in item;
  const title = isSeries
    ? item.metadata.title
    : item.metadata.title || `Tome ${item.metadata.number}`;

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[200px] relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors overflow-hidden cursor-pointer"
    >
      {/* Image de couverture */}
      <div className="relative aspect-[2/3] bg-muted">
        <Cover
          type={isSeries ? "series" : "book"}
          id={item.id}
          alt={`Couverture de ${title}`}
          quality={100}
        />
        {/* Overlay avec les informations au survol */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          <h3 className="font-medium text-sm text-white line-clamp-2">{title}</h3>
          {isSeries && (
            <p className="text-xs text-white/80 mt-1">
              {item.booksCount} tome{item.booksCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
