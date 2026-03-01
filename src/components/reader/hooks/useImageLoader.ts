import { useState, useCallback, useEffect, useRef } from "react";
import logger from "@/lib/logger";

interface ImageDimensions {
  width: number;
  height: number;
}

type ImageKey = number | string; // Support both numeric pages and prefixed keys like "next-1"

interface UseImageLoaderProps {
  bookId: string;
  pages: number[];
  prefetchCount?: number; // Nombre de pages à précharger (défaut: 5)
  nextBook?: { id: string; pages: number[] } | null; // Livre suivant pour prefetch
}

export function useImageLoader({
  bookId,
  pages: _pages,
  prefetchCount = 5,
  nextBook,
}: UseImageLoaderProps) {
  const PREFETCH_CONCURRENCY = 4;
  const [loadedImages, setLoadedImages] = useState<Record<ImageKey, ImageDimensions>>({});
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<ImageKey, string>>({});
  const loadedImagesRef = useRef(loadedImages);
  const imageBlobUrlsRef = useRef(imageBlobUrls);
  const isMountedRef = useRef(true);
  // Track ongoing fetch requests to prevent duplicates
  const pendingFetchesRef = useRef<Set<ImageKey>>(new Set());
  const abortControllersRef = useRef<Map<ImageKey, AbortController>>(new Map());

  // Keep refs in sync with state
  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  useEffect(() => {
    imageBlobUrlsRef.current = imageBlobUrls;
  }, [imageBlobUrls]);

  useEffect(() => {
    isMountedRef.current = true;
    const abortControllers = abortControllersRef.current;
    const pendingFetches = pendingFetchesRef.current;

    return () => {
      isMountedRef.current = false;
      abortControllers.forEach((controller) => controller.abort());
      abortControllers.clear();
      pendingFetches.clear();
    };
  }, []);

  const runWithConcurrency = useCallback(
    async <T,>(items: T[], worker: (item: T) => Promise<void>, concurrency = PREFETCH_CONCURRENCY) => {
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        await Promise.all(batch.map((item) => worker(item)));
      }
    },
    [PREFETCH_CONCURRENCY]
  );

  const getPageUrl = useCallback(
    (pageNum: number) => `/api/komga/books/${bookId}/pages/${pageNum}`,
    [bookId]
  );

  // Prefetch image and store dimensions
  const prefetchImage = useCallback(
    async (pageNum: number) => {
      // Check if we already have both dimensions and blob URL
      const hasDimensions = loadedImagesRef.current[pageNum];
      const hasBlobUrl = imageBlobUrlsRef.current[pageNum];

      if (hasDimensions && hasBlobUrl) {
        return;
      }

      // Check if this page is already being fetched
      if (pendingFetchesRef.current.has(pageNum)) {
        return;
      }

      // Mark as pending
      pendingFetchesRef.current.add(pageNum);
      const controller = new AbortController();
      abortControllersRef.current.set(pageNum, controller);

      try {
        // Use browser cache if available - the server sets Cache-Control headers
        const response = await fetch(getPageUrl(pageNum), {
          cache: "default", // Respect Cache-Control headers from server
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Create image to get dimensions
        const img = new Image();
        img.onload = () => {
          if (!isMountedRef.current || controller.signal.aborted) {
            URL.revokeObjectURL(blobUrl);
            return;
          }

          setLoadedImages((prev) => ({
            ...prev,
            [pageNum]: { width: img.naturalWidth, height: img.naturalHeight },
          }));

          // Store the blob URL for immediate use
          setImageBlobUrls((prev) => ({
            ...prev,
            [pageNum]: blobUrl,
          }));
        };

        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
        };

        img.src = blobUrl;
      } catch {
        // Silently fail prefetch
      } finally {
        // Remove from pending set
        pendingFetchesRef.current.delete(pageNum);
        abortControllersRef.current.delete(pageNum);
      }
    },
    [getPageUrl]
  );

  // Prefetch multiple pages starting from a given page
  const prefetchPages = useCallback(
    async (startPage: number, count: number = prefetchCount) => {
      const pagesToPrefetch = [];

      for (let i = 0; i < count; i++) {
        const pageNum = startPage + i;
        if (pageNum <= _pages.length) {
          const hasDimensions = loadedImagesRef.current[pageNum];
          const hasBlobUrl = imageBlobUrlsRef.current[pageNum];
          const isPending = pendingFetchesRef.current.has(pageNum);

          // Prefetch if we don't have both dimensions AND blob URL AND it's not already pending
          if ((!hasDimensions || !hasBlobUrl) && !isPending) {
            pagesToPrefetch.push(pageNum);
          }
        }
      }

      // Let all prefetch requests run - the server queue will manage concurrency
      // The browser cache and our deduplication prevent redundant requests
      if (pagesToPrefetch.length > 0) {
        runWithConcurrency(pagesToPrefetch, prefetchImage).catch(() => {
          // Silently fail - prefetch is non-critical
        });
      }
    },
    [prefetchImage, prefetchCount, _pages.length, runWithConcurrency]
  );

  // Prefetch pages from next book
  const prefetchNextBook = useCallback(
    async (count: number = prefetchCount) => {
      if (!nextBook) {
        return;
      }

      const pagesToPrefetch = [];

      for (let i = 0; i < count; i++) {
        const pageNum = i + 1; // Pages du livre suivant commencent à 1
        // Pour le livre suivant, on utilise une clé différente pour éviter les conflits
        const nextBookPageKey = `next-${pageNum}`;
        const hasDimensions = loadedImagesRef.current[nextBookPageKey];
        const hasBlobUrl = imageBlobUrlsRef.current[nextBookPageKey];
        const isPending = pendingFetchesRef.current.has(nextBookPageKey);

        if ((!hasDimensions || !hasBlobUrl) && !isPending) {
          pagesToPrefetch.push({ pageNum, nextBookPageKey });
        }
      }

      // Let all prefetch requests run - server queue handles concurrency
      if (pagesToPrefetch.length > 0) {
        runWithConcurrency(pagesToPrefetch, async ({ pageNum, nextBookPageKey }) => {
          // Mark as pending
          pendingFetchesRef.current.add(nextBookPageKey);
          const controller = new AbortController();
          abortControllersRef.current.set(nextBookPageKey, controller);

          try {
            const response = await fetch(`/api/komga/books/${nextBook.id}/pages/${pageNum}`, {
              cache: "default", // Respect Cache-Control headers from server
              signal: controller.signal,
            });
            if (!response.ok) {
              return;
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Create image to get dimensions
            const img = new Image();
            img.onload = () => {
              if (!isMountedRef.current || controller.signal.aborted) {
                URL.revokeObjectURL(blobUrl);
                return;
              }

              setLoadedImages((prev) => ({
                ...prev,
                [nextBookPageKey]: { width: img.naturalWidth, height: img.naturalHeight },
              }));

              // Store the blob URL for immediate use
              setImageBlobUrls((prev) => ({
                ...prev,
                [nextBookPageKey]: blobUrl,
              }));
            };

            img.onerror = () => {
              URL.revokeObjectURL(blobUrl);
            };

            img.src = blobUrl;
          } catch {
            // Silently fail prefetch
          } finally {
            pendingFetchesRef.current.delete(nextBookPageKey);
            abortControllersRef.current.delete(nextBookPageKey);
          }
        }).catch(() => {
          // Silently fail - prefetch is non-critical
        });
      }
    },
    [nextBook, prefetchCount, runWithConcurrency]
  );

  // Force reload handler
  const handleForceReload = useCallback(
    async (
      currentPage: number,
      isDoublePage: boolean,
      shouldShowDoublePage: (page: number) => boolean
    ) => {
      // Révoquer les anciennes URLs blob
      if (imageBlobUrls[currentPage]) {
        URL.revokeObjectURL(imageBlobUrls[currentPage]);
      }
      if (imageBlobUrls[currentPage + 1]) {
        URL.revokeObjectURL(imageBlobUrls[currentPage + 1]);
      }

      try {
        // Fetch page 1 avec cache: reload
        const response1 = await fetch(getPageUrl(currentPage), {
          cache: "reload",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response1.ok) {
          throw new Error(`HTTP ${response1.status}`);
        }

        const blob1 = await response1.blob();
        const blobUrl1 = URL.createObjectURL(blob1);

        const newUrls: Record<number, string> = {
          ...imageBlobUrls,
          [currentPage]: blobUrl1,
        };

        // Fetch page 2 si double page
        if (isDoublePage && shouldShowDoublePage(currentPage)) {
          const response2 = await fetch(getPageUrl(currentPage + 1), {
            cache: "reload",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (!response2.ok) {
            throw new Error(`HTTP ${response2.status}`);
          }

          const blob2 = await response2.blob();
          const blobUrl2 = URL.createObjectURL(blob2);
          newUrls[currentPage + 1] = blobUrl2;
        }

        setImageBlobUrls(newUrls);
      } catch (error) {
        logger.error({ err: error }, "Error reloading images:");
        throw error;
      }
    },
    [imageBlobUrls, getPageUrl]
  );

  // Cleanup blob URLs on unmount only
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []); // Empty dependency array - only cleanup on unmount

  return {
    loadedImages,
    imageBlobUrls,
    prefetchImage,
    prefetchPages,
    prefetchNextBook,
    handleForceReload,
    getPageUrl,
    prefetchCount,
  };
}
