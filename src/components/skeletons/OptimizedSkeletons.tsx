"use client";

import { cn } from "@/lib/utils";

interface OptimizedSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function OptimizedSkeleton({ className, children }: OptimizedSkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted/50", className)}>{children}</div>;
}
