import { Bookmark, Heart, History, LibraryBig, Sparkles } from "lucide-react";
import {
  HomeCarouselSkeleton,
  HomeHeroSkeleton,
  HomeReadingListSkeleton,
  HomeRecommendationSkeleton,
} from "@/components/home/HomeContent";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The root layout also reloads connection-specific navigation data. Keep the
 * route fallback consistent with the Home RSC boundaries while that happens,
 * instead of replacing the whole app with a separate client-side loader.
 */
export default function AppLoading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="container relative mx-auto px-4 pb-8 pt-3">
        <div className="mb-6 hidden justify-end md:flex">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-10 pb-2">
          <HomeHeroSkeleton />
          <HomeCarouselSkeleton icon={LibraryBig} />
          <HomeCarouselSkeleton icon={Heart} />
          <HomeRecommendationSkeleton />
          <HomeReadingListSkeleton icon={Bookmark} />
          <HomeCarouselSkeleton icon={Sparkles} />
          <HomeCarouselSkeleton icon={History} />
        </div>
      </div>
    </main>
  );
}
