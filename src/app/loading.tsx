import { Bookmark, Heart, History, LibraryBig, Sparkles, Wand2 } from "lucide-react";
import { HomeCarouselSkeleton, HomeHeroSkeleton } from "@/components/home/HomeContent";

/**
 * The root layout also reloads connection-specific navigation data. Keep the
 * route fallback consistent with the Home RSC boundaries while that happens,
 * instead of replacing the whole app with a separate client-side loader.
 */
export default function AppLoading() {
  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-10 pb-2">
        <HomeHeroSkeleton />
        <HomeCarouselSkeleton icon={LibraryBig} />
        <HomeCarouselSkeleton icon={Heart} />
        <HomeCarouselSkeleton icon={Bookmark} />
        <HomeCarouselSkeleton icon={Sparkles} />
        <HomeCarouselSkeleton icon={History} />
        <HomeCarouselSkeleton icon={Wand2} />
      </div>
    </main>
  );
}
