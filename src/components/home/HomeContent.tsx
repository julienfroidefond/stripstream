import { Skeleton } from "@/components/ui/skeleton";
import type { HomeData, HomePrimaryData } from "@/types/home";
import type { LucideIcon } from "lucide-react";

export function getContinueReading(data: Pick<HomePrimaryData, "ongoingBooks" | "onDeck">) {
  // Merge onDeck (next unread per series) and ongoingBooks (currently reading),
  // deduplicate by id, onDeck first
  const items = [...(data.onDeck ?? []), ...(data.ongoingBooks ?? [])];
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function getSeriesPool(
  data: Pick<HomePrimaryData, "heroSeries" | "ongoing"> & Pick<HomeData, "favorites">
) {
  // Largest series pool we can offer the hero for name/summary lookups.
  // heroSeries first because it's fetched specifically for these books and
  // is the most reliable source of summary/genres/authors.
  const items = [
    ...(data.heroSeries ?? []),
    ...(data.ongoing ?? []),
    ...(data.favorites ?? []),
  ];
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export function HomeCarouselSkeleton({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-[2/3] w-[188px] flex-shrink-0 rounded-xl sm:w-[200px]"
          />
        ))}
      </div>
    </section>
  );
}

export function HomeHeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 px-5 py-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:px-7 sm:py-7">
      <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
        <Skeleton className="mx-auto aspect-[2/3] w-[180px] rounded-2xl sm:mx-0" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </section>
  );
}
