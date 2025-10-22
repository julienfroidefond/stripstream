import { useState, useCallback, useEffect, useRef } from "react";

interface ImageDimensions {
  width: number;
  height: number;
}

export function useImageLoader(bookId: string, _pages: number[]) {
  const [loadedImages, setLoadedImages] = useState<Record<number, ImageDimensions>>({});
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<number, string>>({});
  const loadedImagesRef = useRef(loadedImages);

  // Keep ref in sync with state
  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  const getPageUrl = useCallback((pageNum: number) => `/api/komga/books/${bookId}/pages/${pageNum}`, [bookId]);

  // Load image dimensions
  const loadImageDimensions = useCallback((pageNum: number) => {
    if (loadedImagesRef.current[pageNum]) return;
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => ({
        ...prev,
        [pageNum]: { width: img.naturalWidth, height: img.naturalHeight }
      }));
    };
    img.src = getPageUrl(pageNum);
  }, [getPageUrl]);

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
      console.error('Error reloading images:', error);
      throw error;
    }
  }, [imageBlobUrls, getPageUrl]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imageBlobUrls]);

  return {
    loadedImages,
    imageBlobUrls,
    loadImageDimensions,
    handleForceReload,
    getPageUrl,
  };
}
