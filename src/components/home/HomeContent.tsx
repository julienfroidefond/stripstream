import { Skeleton } from "@/components/ui/skeleton";
import type { HomeData, HomePrimaryData } from "@/types/home";
import { Wand2 } from "lucide-react";
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

/**
 * Les squelettes reprennent au pixel la structure des rangées réelles
 * (en-tête 38 px, gouttière `space-y-5`, rail avec son `pb-4`) : le contenu qui
 * remplace le squelette ne doit rien déplacer.
 */
const SKELETON_COVERS = 6;

function SkeletonSectionHeader({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between pb-1">
      <div className="flex items-center gap-2.5">
        <Icon aria-hidden className="h-5 w-5 text-muted-foreground" />
        <span className="block pb-0.5">
          <Skeleton className="h-8 w-40" />
        </span>
      </div>
    </div>
  );
}

export function HomeCarouselSkeleton({ icon }: { icon: LucideIcon }) {
  return (
    <section className="space-y-5">
      <SkeletonSectionHeader icon={icon} />
      <div className="flex gap-4 overflow-hidden pb-4">
        {Array.from({ length: SKELETON_COVERS }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-2/3 w-[188px] shrink-0 rounded-xl sm:w-[200px]"
          />
        ))}
      </div>
    </section>
  );
}

/** Rangée « Mes listes » : couverture puis légende de deux lignes. */
export function HomeReadingListSkeleton({ icon }: { icon: LucideIcon }) {
  return (
    <section className="space-y-5">
      <SkeletonSectionHeader icon={icon} />
      <div className="flex gap-4 overflow-hidden pb-4">
        {Array.from({ length: SKELETON_COVERS }).map((_, index) => (
          <div key={index} className="flex w-[160px] shrink-0 flex-col gap-1.5 sm:w-[188px]">
            <Skeleton className="aspect-2/3 w-full rounded-xl" />
            <div className="flex flex-col gap-0.5 px-0.5">
              <Skeleton className="h-[18px] w-4/5 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeHeroSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-surface-1 px-5 py-6 sm:px-8 sm:py-9">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
        <Skeleton className="mx-auto aspect-2/3 w-[168px] shrink-0 rounded-xl sm:mx-0 sm:w-[196px]" />
        <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-1.5 w-full max-w-md rounded-full" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-1.5 w-2 rounded-full first:w-8" />
          ))}
        </div>
        <Skeleton className="h-9 w-[84px] rounded-lg" />
      </div>
    </section>
  );
}

/** Carrousel « Pour vous », qui s'affiche en grand format par défaut. */
export function HomeRecommendationSkeleton() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <Wand2 aria-hidden className="h-5 w-5 text-muted-foreground" />
          <span className="block pb-0.5">
            <Skeleton className="h-8 w-40" />
          </span>
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-surface-1 px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-7">
          <Skeleton className="mx-auto aspect-2/3 w-[170px] shrink-0 rounded-xl sm:mx-0 sm:w-[180px]" />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 sm:items-start">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-3/5" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-11 w-40 rounded-lg" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-1.5 w-2 rounded-full first:w-8" />
            ))}
          </div>
          <Skeleton className="h-9 w-[84px] rounded-lg" />
        </div>
      </div>
    </section>
  );
}
