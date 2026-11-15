import { Bookmark, Heart, History, LibraryBig, Sparkles } from "lucide-react";
import {
  HomeCarouselSkeleton,
  HomeHeroSkeleton,
  HomeReadingListSkeleton,
  HomeRecommendationSkeleton,
} from "@/components/home/HomeContent";

/**
 * The root layout also reloads connection-specific navigation data. Keep the
 * route fallback consistent with the Home RSC boundaries while that happens,
 * instead of replacing the whole app with a separate client-side loader.
 */
export default function AppLoading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="container relative mx-auto px-4 pb-8">
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
