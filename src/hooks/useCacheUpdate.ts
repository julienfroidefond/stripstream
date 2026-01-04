"use client";

import { useMemo, useCallback } from "react";
import { useServiceWorker } from "@/contexts/ServiceWorkerContext";

interface UseCacheUpdateOptions {
  /** Match exact URL or use pattern matching */
  exact?: boolean;
}

interface UseCacheUpdateResult {
  /** Whether there's a pending update for this URL pattern */
  hasUpdate: boolean;
  /** Timestamp of the last update */
  lastUpdateTime: number | null;
  /** Clear the update notification for this URL */
  clearUpdate: () => void;
  /** All matching updates */
  updates: Array<{ url: string; timestamp: number }>;
}

/**
 * Hook to listen for cache updates from the service worker
 *
 * @param urlPattern - URL or pattern to match against cache updates
 * @param options - Options for matching behavior
 *
 * @example
 * // Match exact URL
 * const { hasUpdate, clearUpdate } = useCacheUpdate('/api/komga/home', { exact: true });
 *
 * @example
 * // Match URL pattern (contains)
 * const { hasUpdate, clearUpdate } = useCacheUpdate('/api/komga/series');
 *
 * @example
 * // Use in component
 * useEffect(() => {
 *   if (hasUpdate) {
 *     refetch();
 *     clearUpdate();
 *   }
 * }, [hasUpdate, refetch, clearUpdate]);
 */
export function useCacheUpdate(
  urlPattern: string,
  options: UseCacheUpdateOptions = {}
): UseCacheUpdateResult {
  const { exact = false } = options;
  const { cacheUpdates, clearCacheUpdate } = useServiceWorker();

  const matchingUpdates = useMemo(() => {
    return cacheUpdates.filter((update) => {
      if (exact) {
        return update.url === urlPattern || update.url.endsWith(urlPattern);
      }
      return update.url.includes(urlPattern);
    });
  }, [cacheUpdates, urlPattern, exact]);

  const hasUpdate = matchingUpdates.length > 0;

  const lastUpdateTime = useMemo(() => {
    if (matchingUpdates.length === 0) return null;
    return Math.max(...matchingUpdates.map((u) => u.timestamp));
  }, [matchingUpdates]);

  const clearUpdate = useCallback(() => {
    matchingUpdates.forEach((update) => {
      clearCacheUpdate(update.url);
    });
  }, [matchingUpdates, clearCacheUpdate]);

  return {
    hasUpdate,
    lastUpdateTime,
    clearUpdate,
    updates: matchingUpdates,
  };
}

/**
 * Hook to check if any cache update is available
 * Useful for showing a global "refresh available" indicator
 */
export function useAnyCacheUpdate(): {
  hasAnyUpdate: boolean;
  updateCount: number;
  clearAll: () => void;
} {
  const { cacheUpdates, clearAllCacheUpdates } = useServiceWorker();

  return {
    hasAnyUpdate: cacheUpdates.length > 0,
    updateCount: cacheUpdates.length,
    clearAll: clearAllCacheUpdates,
  };
}
