import { useState, useCallback, useEffect, useRef } from "react";
import logger from "@/lib/logger";

interface ImageDimensions {
  width: number;
  height: number;
}

const RETRY_BACKOFFS_MS = [800, 1600] as const;

// Fenêtre de pages conservées en mémoire autour de la page courante.
// On lit majoritairement vers l'avant, donc plus de buffer en aval.
const EVICTION_BEHIND = 10;
const EVICTION_AHEAD = 20;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new Error("aborted"));
      },
      { once: true }
    );
  });
}

type ImageKey = number | string; // Support both numeric pages and prefixed keys like "next-1"

interface UseImageLoaderProps {
  pageUrlBuilder: (pageNum: number) => string;
  pages: number[];
  prefetchCount?: number; // Nombre de pages à précharger (défaut: 5)
  nextBook?: { getPageUrl: (pageNum: number) => string; pages: number[] } | null; // Livre suivant pour prefetch
}

export function useImageLoader({
  pageUrlBuilder,
  pages: _pages,
  prefetchCount = 5,
  nextBook,
}: UseImageLoaderProps) {
  const PREFETCH_CONCURRENCY = 4;
  const [loadedImages, setLoadedImages] = useState<Record<ImageKey, ImageDimensions>>({});
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<ImageKey, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<ImageKey, boolean>>({});
  const loadedImagesRef = useRef(loadedImages);
  const imageBlobUrlsRef = useRef(imageBlobUrls);
  const isMountedRef = useRef(true);
  // Track ongoing fetch requests to prevent duplicates
  const pendingFetchesRef = useRef<Set<ImageKey>>(new Set());
  const abortControllersRef = useRef<Map<ImageKey, AbortController>>(new Map());
  // Track promises for pages being loaded so we can await them
  const loadingPromisesRef = useRef<Map<ImageKey, Promise<void>>>(new Map());

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
    const loadingPromises = loadingPromisesRef.current;

    return () => {
      isMountedRef.current = false;
      abortControllers.forEach((controller) => controller.abort());
      abortControllers.clear();
      pendingFetches.clear();
      loadingPromises.clear();
    };
  }, []);

  const cancelAllPrefetches = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    pendingFetchesRef.current.clear();
    loadingPromisesRef.current.clear();
  }, []);

  // Évince les pages hors de la fenêtre [currentPage - BEHIND, currentPage + AHEAD]
  // pour borner la mémoire (Blob URLs + dimensions). Les pages du livre suivant
  // (clés "next-N") et les fetches en cours sont préservés.
  const evictOutsideWindow = useCallback((currentPage: number) => {
    const minKeep = currentPage - EVICTION_BEHIND;
    const maxKeep = currentPage + EVICTION_AHEAD;
    const keysToEvict: number[] = [];

    Object.keys(imageBlobUrlsRef.current).forEach((keyStr) => {
      const num = Number(keyStr);
      if (Number.isNaN(num)) return;
      if (pendingFetchesRef.current.has(num)) return;
      if (num < minKeep || num > maxKeep) keysToEvict.push(num);
    });

    if (keysToEvict.length === 0) return;

    keysToEvict.forEach((key) => {
      const url = imageBlobUrlsRef.current[key];
      if (url) URL.revokeObjectURL(url);
    });

    setImageBlobUrls((prev) => {
      const next = { ...prev };
      keysToEvict.forEach((key) => delete next[key]);
      return next;
    });
    setLoadedImages((prev) => {
      const next = { ...prev };
      keysToEvict.forEach((key) => delete next[key]);
      return next;
    });
    setImageErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      keysToEvict.forEach((key) => {
        if (key in next) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const runWithConcurrency = useCallback(
    async <T,>(items: T[], worker: (item: T) => Promise<void>, concurrency = PREFETCH_CONCURRENCY) => {
      for (let i = 0; i < items.length; i += concurrency) {
        if (!isMountedRef.current) {
          return;
        }
        const batch = items.slice(i, i + concurrency);
        await Promise.all(batch.map((item) => worker(item)));
      }
    },
    [PREFETCH_CONCURRENCY]
  );

  const getPageUrl = useCallback(
    (pageNum: number) => pageUrlBuilder(pageNum),
    [pageUrlBuilder]
  );

  // Une tentative : fetch + decode → setState ou throw
  const fetchAndDecodeOnce = useCallback(
    async (pageNum: number, controller: AbortController): Promise<void> => {
      const response = await fetch(getPageUrl(pageNum), {
        cache: "default",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (!isMountedRef.current || controller.signal.aborted) {
              URL.revokeObjectURL(blobUrl);
              reject(new Error("Aborted"));
              return;
            }
            setLoadedImages((prev) => ({
              ...prev,
              [pageNum]: { width: img.naturalWidth, height: img.naturalHeight },
            }));
            setImageBlobUrls((prev) => {
              const previous = prev[pageNum];
              if (previous && previous !== blobUrl) URL.revokeObjectURL(previous);
              return { ...prev, [pageNum]: blobUrl };
            });
            setImageErrors((prev) => {
              if (!prev[pageNum]) return prev;
              const next = { ...prev };
              delete next[pageNum];
              return next;
            });
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error("Image decode error"));
          };
          img.src = blobUrl;
        });
      } catch (err) {
        // Si le set state a déjà eu lieu, blobUrl a été conservé. Sinon on l'a révoqué dans onerror.
        throw err;
      }
    },
    [getPageUrl]
  );

  // Prefetch image avec retry exponential backoff (3 tentatives au total)
  const prefetchImage = useCallback(
    async (pageNum: number) => {
      if (!isMountedRef.current) return;

      const hasDimensions = loadedImagesRef.current[pageNum];
      const hasBlobUrl = imageBlobUrlsRef.current[pageNum];
      if (hasDimensions && hasBlobUrl) return;

      const existingPromise = loadingPromisesRef.current.get(pageNum);
      if (existingPromise) return existingPromise;

      pendingFetchesRef.current.add(pageNum);
      const controller = new AbortController();
      abortControllersRef.current.set(pageNum, controller);

      const promise = (async () => {
        let lastError: unknown;
        const maxAttempts = 1 + RETRY_BACKOFFS_MS.length;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (!isMountedRef.current || controller.signal.aborted) return;

          if (attempt > 0) {
            try {
              await sleep(RETRY_BACKOFFS_MS[attempt - 1], controller.signal);
            } catch {
              return; // aborted
            }
          }

          try {
            await fetchAndDecodeOnce(pageNum, controller);
            return; // success
          } catch (err) {
            lastError = err;
            if (controller.signal.aborted) return;
          }
        }

        if (isMountedRef.current && !controller.signal.aborted) {
          logger.warn({ pageNum, err: lastError }, "Failed to load page after retries");
          setImageErrors((prev) => ({ ...prev, [pageNum]: true }));
        }
      })().finally(() => {
        pendingFetchesRef.current.delete(pageNum);
        abortControllersRef.current.delete(pageNum);
        loadingPromisesRef.current.delete(pageNum);
      });

      loadingPromisesRef.current.set(pageNum, promise);
      return promise;
    },
    [fetchAndDecodeOnce]
  );

  // Retry explicite déclenché par l'UI : reset l'état d'erreur puis re-prefetch
  const retryImage = useCallback(
    async (pageNum: number) => {
      setImageErrors((prev) => {
        if (!prev[pageNum]) return prev;
        const next = { ...prev };
        delete next[pageNum];
        return next;
      });
      return prefetchImage(pageNum);
    },
    [prefetchImage]
  );

  // Prefetch multiple pages starting from a given page
  const prefetchPages = useCallback(
    async (
      startPage: number,
      count: number = prefetchCount,
      excludePages: number[] = [],
      concurrency?: number
    ) => {
      const pagesToPrefetch = [];
      const excludeSet = new Set(excludePages);

      for (let i = 0; i < count; i++) {
        const pageNum = startPage + i;
        if (pageNum <= _pages.length && !excludeSet.has(pageNum)) {
          const hasDimensions = loadedImagesRef.current[pageNum];
          const hasBlobUrl = imageBlobUrlsRef.current[pageNum];
          const isPending = pendingFetchesRef.current.has(pageNum);

          // Prefetch if we don't have both dimensions AND blob URL AND it's not already pending
          if ((!hasDimensions || !hasBlobUrl) && !isPending) {
            pagesToPrefetch.push(pageNum);
          }
        }
      }

      // Use provided concurrency or default
      const effectiveConcurrency = concurrency ?? PREFETCH_CONCURRENCY;

      // Let all prefetch requests run - the server queue will manage concurrency
      // The browser cache and our deduplication prevent redundant requests
      if (pagesToPrefetch.length > 0) {
        runWithConcurrency(pagesToPrefetch, prefetchImage, effectiveConcurrency).catch(() => {
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
          if (!isMountedRef.current) {
            return;
          }

          // Mark as pending
          pendingFetchesRef.current.add(nextBookPageKey);
          const controller = new AbortController();
          abortControllersRef.current.set(nextBookPageKey, controller);

          try {
            const response = await fetch(nextBook.getPageUrl(pageNum), {
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

              setImageBlobUrls((prev) => {
                const previous = prev[nextBookPageKey];
                if (previous && previous !== blobUrl) {
                  URL.revokeObjectURL(previous);
                }
                return { ...prev, [nextBookPageKey]: blobUrl };
              });
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

  // Cleanup blob URLs on unmount only
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []); // Empty dependency array - only cleanup on unmount

  // Check if a page is currently being loaded
  const isPageLoading = useCallback(
    (pageNum: number) => {
      return pendingFetchesRef.current.has(pageNum);
    },
    []
  );

  return {
    loadedImages,
    imageBlobUrls,
    imageErrors,
    prefetchImage,
    retryImage,
    prefetchPages,
    prefetchNextBook,
    cancelAllPrefetches,
    evictOutsideWindow,
    getPageUrl,
    prefetchCount,
    isPageLoading,
  };
}
