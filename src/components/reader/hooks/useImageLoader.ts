/* eslint-disable no-console */
import { useState, useCallback, useEffect, useRef } from "react";
import { BlobUrlRegistry, type ImageKey } from "./blobUrlRegistry";
import { computeEvictionKeys } from "./imageEviction";

interface ImageDimensions {
  width: number;
  height: number;
}

export interface PageImage {
  url: string | null;
  error: boolean;
  isLoading: boolean;
}

const RETRY_BACKOFFS_MS = [800, 1600] as const;

// Fenêtre de pages conservées en mémoire autour de la page courante.
// On lit majoritairement vers l'avant, donc plus de buffer en aval.
const EVICTION_BEHIND = 10;
const EVICTION_AHEAD = 20;

const PREFETCH_CONCURRENCY = 4;

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

interface UseImageLoaderProps {
  pageUrlBuilder: (pageNum: number) => string;
  pages: number[];
  currentPage: number;
  shouldShowDoublePage: (pageNum: number) => boolean;
  prefetchCount?: number; // Nombre de pages à précharger (défaut: 5)
  nextBook?: { getPageUrl: (pageNum: number) => string; pages: number[] } | null; // Livre suivant pour prefetch
}

export function useImageLoader({
  pageUrlBuilder,
  pages: _pages,
  currentPage,
  shouldShowDoublePage,
  prefetchCount = 5,
  nextBook,
}: UseImageLoaderProps) {
  // NOTE (perf): état groupé par image (loadedImages / imageBlobUrls / imageErrors).
  // Les URLs vivent aussi dans BlobUrlRegistry, source de vérité synchrone pour le
  // cleanup ; les dimensions et erreurs gardent leurs refs pour les callbacks.
  // Regrouper ces slices dans un seul état par clé réduirait le nombre de setState
  // par fetch, mais c'est risqué car de nombreux callbacks (evictOutsideWindow,
  // prefetchKey, retryImage) lisent/écrivent chaque slice séparément. Laissé tel
  // quel : refactorisation non triviale, à traiter séparément.
  const [loadedImages, setLoadedImages] = useState<Record<ImageKey, ImageDimensions>>({});
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<ImageKey, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<ImageKey, boolean>>({});
  const loadedImagesRef = useRef(loadedImages);
  const imageErrorsRef = useRef(imageErrors);
  const [blobUrls] = useState(() => new BlobUrlRegistry());
  const isMountedRef = useRef(true);
  const pendingFetchesRef = useRef<Set<ImageKey>>(new Set());
  const abortControllersRef = useRef<Map<ImageKey, AbortController>>(new Map());
  const loadingPromisesRef = useRef<Map<ImageKey, Promise<void>>>(new Map());

  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  useEffect(() => {
    imageErrorsRef.current = imageErrors;
  }, [imageErrors]);

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
    const count = abortControllersRef.current.size;
    console.debug(`[reader/image] cancelAllPrefetches: aborting ${count} in-flight fetches`);
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    pendingFetchesRef.current.clear();
    loadingPromisesRef.current.clear();
  }, []);

  // Évince les pages hors de la fenêtre [currentPage - BEHIND, currentPage + AHEAD]
  // pour borner la mémoire (Blob URLs + dimensions). Les pages du livre suivant
  // (clés "next-N") et les fetches en cours sont préservés.
  const evictOutsideWindow = useCallback((currentPage: number) => {
    const keysToEvict = computeEvictionKeys(
      blobUrls.keys(),
      currentPage,
      EVICTION_BEHIND,
      EVICTION_AHEAD,
      pendingFetchesRef.current
    );

    if (keysToEvict.length === 0) return;

    console.debug(`[reader/image] evict: ${keysToEvict.length} pages (window ${currentPage - EVICTION_BEHIND}–${currentPage + EVICTION_AHEAD}), keys:`, keysToEvict);

    keysToEvict.forEach((key) => blobUrls.delete(key));

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
  }, [blobUrls]);

  const runWithConcurrency = useCallback(
    async <T,>(items: T[], worker: (item: T) => Promise<void>, concurrency = PREFETCH_CONCURRENCY) => {
      for (let i = 0; i < items.length; i += concurrency) {
        if (!isMountedRef.current) return;
        const batch = items.slice(i, i + concurrency);
        await Promise.all(batch.map((item) => worker(item)));
      }
    },
    []
  );

  const getPageUrl = useCallback(
    (pageNum: number) => pageUrlBuilder(pageNum),
    [pageUrlBuilder]
  );

  // Une tentative : fetch + decode → setState ou throw
  const fetchAndDecodeOnce = useCallback(
    async (key: ImageKey, url: string, controller: AbortController): Promise<void> => {
      const response = await fetch(url, {
        cache: "default",
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(`[reader/image] HTTP error key=${String(key)} status=${response.status} url=${url}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          if (!isMountedRef.current || controller.signal.aborted) {
            console.debug(`[reader/image] aborted after decode key=${String(key)} mounted=${isMountedRef.current}`);
            URL.revokeObjectURL(blobUrl);
            reject(new Error("Aborted"));
            return;
          }
          setLoadedImages((prev) => ({
            ...prev,
            [key]: { width: img.naturalWidth, height: img.naturalHeight },
          }));
          blobUrls.set(key, blobUrl);
          setImageBlobUrls((prev) => ({ ...prev, [key]: blobUrl }));
          setImageErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
          resolve();
        };
        img.onerror = () => {
          console.warn(`[reader/image] decode error key=${String(key)}`);
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Image decode error"));
        };
        img.src = blobUrl;
      });
    },
    [blobUrls]
  );

  // Prefetch générique avec retry exponential backoff (3 tentatives au total).
  // Fonctionne pour les pages numériques du livre courant ET les clés préfixées
  // ("next-N") du livre suivant.
  const prefetchKey = useCallback(
    async (key: ImageKey, url: string) => {
      if (!isMountedRef.current) return;

      const hasDimensions = loadedImagesRef.current[key];
      const hasBlobUrl = blobUrls.has(key);
      if (hasDimensions && hasBlobUrl) return;

      const existingPromise = loadingPromisesRef.current.get(key);
      if (existingPromise) return existingPromise;

      pendingFetchesRef.current.add(key);
      const controller = new AbortController();
      abortControllersRef.current.set(key, controller);

      const promise = (async () => {
        let lastError: unknown;
        const maxAttempts = 1 + RETRY_BACKOFFS_MS.length;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (!isMountedRef.current || controller.signal.aborted) {
            console.debug(`[reader/image] aborted before attempt ${attempt} key=${String(key)}`);
            return;
          }

          if (attempt > 0) {
            console.warn(`[reader/image] retry ${attempt}/${maxAttempts - 1} key=${String(key)} backoff=${RETRY_BACKOFFS_MS[attempt - 1]}ms err=${String(lastError)}`);
            try {
              await sleep(RETRY_BACKOFFS_MS[attempt - 1], controller.signal);
            } catch {
              console.debug(`[reader/image] sleep aborted during retry key=${String(key)}`);
              return;
            }
          }

          try {
            await fetchAndDecodeOnce(key, url, controller);
            return;
          } catch (err) {
            lastError = err;
            if (controller.signal.aborted) {
              console.debug(`[reader/image] fetch aborted attempt=${attempt} key=${String(key)}`);
              return;
            }
          }
        }

        if (isMountedRef.current && !controller.signal.aborted) {
          console.error(`[reader/image] FAILED after ${maxAttempts} attempts key=${String(key)} url=${url} err=${String(lastError)}`);
          setImageErrors((prev) => ({ ...prev, [key]: true }));
        }
      })().finally(() => {
        pendingFetchesRef.current.delete(key);
        abortControllersRef.current.delete(key);
        loadingPromisesRef.current.delete(key);
      });

      loadingPromisesRef.current.set(key, promise);
      return promise;
    },
    [blobUrls, fetchAndDecodeOnce]
  );

  const prefetchImage = useCallback(
    async (pageNum: number) => prefetchKey(pageNum, getPageUrl(pageNum)),
    [prefetchKey, getPageUrl]
  );

  // Retry explicite déclenché par l'UI : reset l'état d'erreur puis re-prefetch
  const retryImage = useCallback(
    async (pageNum: number) => {
      delete imageErrorsRef.current[pageNum];
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
      const pagesToPrefetch: number[] = [];
      const excludeSet = new Set(excludePages);

      for (let i = 0; i < count; i++) {
        const pageNum = startPage + i;
        if (pageNum <= _pages.length && !excludeSet.has(pageNum)) {
          const hasDimensions = loadedImagesRef.current[pageNum];
          const hasBlobUrl = blobUrls.has(pageNum);
          const isPending = pendingFetchesRef.current.has(pageNum);
          const hasError = imageErrorsRef.current[pageNum];

          if ((!hasDimensions || !hasBlobUrl) && !isPending && !hasError) {
            pagesToPrefetch.push(pageNum);
          }
        }
      }

      if (pagesToPrefetch.length > 0) {
        runWithConcurrency(pagesToPrefetch, prefetchImage, concurrency ?? PREFETCH_CONCURRENCY).catch(
          () => {
            // Silently fail - prefetch is non-critical
          }
        );
      }
    },
    [blobUrls, prefetchImage, prefetchCount, _pages.length, runWithConcurrency]
  );

  // Prefetch pages from next book (clés préfixées "next-N" pour éviter les conflits)
  const prefetchNextBook = useCallback(
    async (count: number = prefetchCount) => {
      if (!nextBook) return;

      const items: { key: string; url: string }[] = [];

      for (let i = 0; i < count; i++) {
        const pageNum = i + 1; // Pages du livre suivant commencent à 1
        const key = `next-${pageNum}`;
        const hasDimensions = loadedImagesRef.current[key];
        const hasBlobUrl = blobUrls.has(key);
        const isPending = pendingFetchesRef.current.has(key);

        if ((!hasDimensions || !hasBlobUrl) && !isPending) {
          items.push({ key, url: nextBook.getPageUrl(pageNum) });
        }
      }

      if (items.length > 0) {
        runWithConcurrency(items, ({ key, url }) => prefetchKey(key, url) as Promise<void>).catch(
          () => {
            // Silently fail - prefetch is non-critical
          }
        );
      }
    },
    [blobUrls, nextBook, prefetchCount, runWithConcurrency, prefetchKey]
  );

  // Le loader possède la politique de mémoire : prefetch et éviction suivent
  // la position du reader sans que `useReaderState` ait à l'orchestrer.
  useEffect(() => {
    const spread = shouldShowDoublePage(currentPage);
    const visiblePages = spread ? [currentPage, currentPage + 1] : [currentPage];

    console.debug(`[reader/image] page=${currentPage} visible=[${visiblePages.join(",")}] doublePage=${spread}`);
    Promise.all(visiblePages.map((page) => prefetchImage(page))).catch((err) => {
      console.warn(`[reader/image] prefetch failed page=${currentPage}`, err);
    });

    const concurrency = spread ? 2 : 4;
    prefetchPages(currentPage, prefetchCount, visiblePages, concurrency);

    if (spread && currentPage + prefetchCount < _pages.length) {
      prefetchPages(currentPage + prefetchCount, 1, visiblePages, concurrency);
    }

    const pagesFromEnd = _pages.length - currentPage;
    if (pagesFromEnd <= prefetchCount && nextBook) {
      prefetchNextBook(prefetchCount);
    }

    evictOutsideWindow(currentPage);
  }, [
    currentPage,
    shouldShowDoublePage,
    prefetchImage,
    prefetchPages,
    prefetchNextBook,
    evictOutsideWindow,
    prefetchCount,
    _pages.length,
    nextBook,
  ]);

  // Le registre est la source de vérité : même un blob décodé juste avant
  // l'unmount est présent ici, donc révoqué.
  useEffect(() => {
    return () => {
      console.debug(`[reader/image] unmount: revoking ${blobUrls.size} blob URLs`);
      blobUrls.clear();
    };
  }, [blobUrls]);

  const getPageImage = useCallback(
    (pageNum: number): PageImage => ({
      url: imageBlobUrls[pageNum] ?? null,
      error: Boolean(imageErrors[pageNum]),
      isLoading: !imageBlobUrls[pageNum],
    }),
    [imageBlobUrls, imageErrors]
  );

  return {
    getPageImage,
    retryImage,
    cancelAllPrefetches,
  };
}
