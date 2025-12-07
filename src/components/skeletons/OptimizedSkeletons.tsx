"use client";

import { cn } from "@/lib/utils";

interface OptimizedSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function OptimizedSkeleton({ className, children }: OptimizedSkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted/50", className)}>{children}</div>;
}

export function HomePageSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <OptimizedSkeleton className="h-8 w-48" />
        <OptimizedSkeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Hero Section */}
      <OptimizedSkeleton className="h-64 w-full rounded-lg" />

      {/* Media Rows */}
      <div className="space-y-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-2">
              <OptimizedSkeleton className="h-6 w-6 rounded" />
              <OptimizedSkeleton className="h-6 w-32" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <OptimizedSkeleton key={j} className="aspect-[3/4] w-full rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function SeriesPageSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <OptimizedSkeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <OptimizedSkeleton className="h-8 w-64" />
          <OptimizedSkeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <OptimizedSkeleton key={i} className="aspect-[3/4] w-full rounded" />
        ))}
      </div>
    </main>
  );
}

export function LibraryPageSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <OptimizedSkeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <OptimizedSkeleton className="h-8 w-24" />
          <OptimizedSkeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Series Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <OptimizedSkeleton key={i} className="aspect-[3/4] w-full rounded" />
        ))}
      </div>
    </main>
  );
}
