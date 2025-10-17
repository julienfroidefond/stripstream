import { OptimizedSkeleton } from "@/components/skeletons/OptimizedSkeletons";

export default function SeriesLoading() {
  return (
    <div className="container">
      {/* Series Header */}
      <div className="relative min-h-[300px] md:h-[300px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden bg-muted/50">
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full">
            {/* Cover */}
            <OptimizedSkeleton className="w-[180px] aspect-[2/3] rounded-lg flex-shrink-0" />

            {/* Info */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full max-w-xl">
              <OptimizedSkeleton className="h-8 w-64 mx-auto md:mx-0" />
              <OptimizedSkeleton className="h-16 w-full" />
              <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
                <OptimizedSkeleton className="h-6 w-24 rounded-full" />
                <OptimizedSkeleton className="h-6 w-20" />
                <OptimizedSkeleton className="h-10 w-10 rounded" />
                <OptimizedSkeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="space-y-8 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <OptimizedSkeleton className="h-5 w-32 ml-auto" />
          <div className="flex items-center justify-end gap-2">
            <OptimizedSkeleton className="h-10 w-24" />
            <OptimizedSkeleton className="h-10 w-10 rounded" />
            <OptimizedSkeleton className="h-10 w-10 rounded" />
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

