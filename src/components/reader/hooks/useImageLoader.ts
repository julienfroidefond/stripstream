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

export function useImageLoader({ bookId, pages: _pages, prefetchCount = 5, nextBook }: UseImageLoaderProps) {
  const [loadedImages, setLoadedImages] = useState<Record<ImageKey, ImageDimensions>>({});
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<ImageKey, string>>({});
  const loadedImagesRef = useRef(loadedImages);
  const imageBlobUrlsRef = useRef(imageBlobUrls);

  // Keep refs in sync with state
  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  useEffect(() => {
    imageBlobUrlsRef.current = imageBlobUrls;
  }, [imageBlobUrls]);

  const getPageUrl = useCallback((pageNum: number) => `/api/komga/books/${bookId}/pages/${pageNum}`, [bookId]);

  // Prefetch image and store dimensions
  const prefetchImage = useCallback(async (pageNum: number) => {
    // Check if we already have both dimensions and blob URL
    const hasDimensions = loadedImagesRef.current[pageNum];
    const hasBlobUrl = imageBlobUrlsRef.current[pageNum];
    
    if (hasDimensions && hasBlobUrl) {
      return;
    }
    
    try {
      const response = await fetch(getPageUrl(pageNum));
      if (!response.ok) {
        return;
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create image to get dimensions
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => ({
          ...prev,
          [pageNum]: { width: img.naturalWidth, height: img.naturalHeight }
        }));
        
        // Store the blob URL for immediate use
        setImageBlobUrls(prev => ({
          ...prev,
          [pageNum]: blobUrl
        }));
      };
      img.src = blobUrl;
    } catch {
      // Silently fail prefetch
    }
  }, [getPageUrl]);

  // Prefetch multiple pages starting from a given page
  const prefetchPages = useCallback(async (startPage: number, count: number = prefetchCount) => {
    const pagesToPrefetch = [];
    
    for (let i = 0; i < count; i++) {
      const pageNum = startPage + i;
      if (pageNum <= _pages.length) {
        const hasDimensions = loadedImagesRef.current[pageNum];
        const hasBlobUrl = imageBlobUrlsRef.current[pageNum];
        
        // Prefetch if we don't have both dimensions AND blob URL
        if (!hasDimensions || !hasBlobUrl) {
          pagesToPrefetch.push(pageNum);
        }
      }
    }
    
    // Prefetch all pages in parallel
    if (pagesToPrefetch.length > 0) {
      await Promise.all(pagesToPrefetch.map(pageNum => prefetchImage(pageNum)));
    }
  }, [prefetchImage, prefetchCount, _pages.length]);

  // Prefetch pages from next book
  const prefetchNextBook = useCallback(async (count: number = prefetchCount) => {
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
      
      if (!hasDimensions || !hasBlobUrl) {
        pagesToPrefetch.push({ pageNum, nextBookPageKey });
      }
    }
    
    // Prefetch all pages in parallel
    if (pagesToPrefetch.length > 0) {
      await Promise.all(pagesToPrefetch.map(async ({ pageNum, nextBookPageKey }) => {
        try {
          const response = await fetch(`/api/komga/books/${nextBook.id}/pages/${pageNum}`);
          if (!response.ok) {
            return;
          }
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          // Create image to get dimensions
          const img = new Image();
          img.onload = () => {
            setLoadedImages(prev => ({
              ...prev,
              [nextBookPageKey]: { width: img.naturalWidth, height: img.naturalHeight }
            }));
            
            // Store the blob URL for immediate use
            setImageBlobUrls(prev => ({
              ...prev,
              [nextBookPageKey]: blobUrl
            }));
          };
          img.src = blobUrl;
        } catch {
          // Silently fail prefetch
        }
      }));
    }
  }, [nextBook, prefetchCount]);

  // Force reload handler
  const handleForceReload = useCallback(async (currentPage: number, isDoublePage: boolean, shouldShowDoublePage: (page: number) => boolean) => {
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
        cache: 'reload',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response1.ok) {
        throw new Error(`HTTP ${response1.status}`);
      }
      
      const blob1 = await response1.blob();
      const blobUrl1 = URL.createObjectURL(blob1);
      
      const newUrls: Record<number, string> = {
        ...imageBlobUrls,
        [currentPage]: blobUrl1
      };
      
      // Fetch page 2 si double page
      if (isDoublePage && shouldShowDoublePage(currentPage)) {
        const response2 = await fetch(getPageUrl(currentPage + 1), {
          cache: 'reload',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
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
      logger.error({ err: error }, 'Error reloading images:');
      throw error;
    }
  }, [imageBlobUrls, getPageUrl]);

  // Cleanup blob URLs on unmount only
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrlsRef.current).forEach(url => {
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
