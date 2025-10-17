import { OptimizedSkeleton } from "@/components/skeletons/OptimizedSkeletons";

export default function LibraryLoading() {
  return (
    <div className="container py-8 space-y-8">
      {/* Header avec titre + compteur + refresh */}
      <div className="flex items-center justify-between">
        <OptimizedSkeleton className="h-10 w-64" />
        <div className="flex items-center gap-2">
          <OptimizedSkeleton className="h-5 w-48" />
          <OptimizedSkeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Filters section */}
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full">
              <OptimizedSkeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <OptimizedSkeleton className="h-10 w-24" />
              <OptimizedSkeleton className="h-10 w-10 rounded" />
              <OptimizedSkeleton className="h-10 w-10 rounded" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <OptimizedSkeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <OptimizedSkeleton className="h-5 w-32 order-2 sm:order-1" />
          <OptimizedSkeleton className="h-10 w-64 order-1 sm:order-2" />
        </div>
      </div>
    </div>
  );
}

