import { useRef, useCallback, useEffect } from "react";
import PhotoSwipe from "photoswipe";

interface UsePhotoSwipeZoomProps {
  loadedImages: Record<number, { width: number; height: number }>;
  currentPage: number;
  getPageUrl: (pageNum: number) => string;
}

export function usePhotoSwipeZoom({
  loadedImages,
  currentPage,
  getPageUrl,
}: UsePhotoSwipeZoomProps) {
  const pswpRef = useRef<PhotoSwipe | null>(null);

  // Handle zoom via button
  const handleZoom = useCallback(() => {
    const dims = loadedImages[currentPage];
    if (!dims) return;

    const dataSource = [{
      src: getPageUrl(currentPage),
      width: dims.width,
      height: dims.height,
      alt: `Page ${currentPage}`
    }];

    // Close any existing instance
    if (pswpRef.current) {
      pswpRef.current.close();
    }

    // Create and open PhotoSwipe
    const pswp = new PhotoSwipe({
      dataSource,
      index: 0,
      bgOpacity: 0.9,
      showHideAnimationType: 'fade',
      initialZoomLevel: 0.25,
      secondaryZoomLevel: 0.5, // Niveau de zoom au double-clic
      maxZoomLevel: 4,
      clickToCloseNonZoomable: true, // Ferme au clic simple
      tapAction: 'zoom', // Ferme au tap
      wheelToZoom: true,
      pinchToClose: false, // Pinch pour fermer
      closeOnVerticalDrag: true, // Swipe vertical pour fermer
      escKey: true, // ESC ferme le zoom
      arrowKeys: false, // On gère les flèches nous-mêmes
    });

    pswpRef.current = pswp;
    pswp.init();

    // Clean up on close
    pswp.on('close', () => {
      pswpRef.current = null;
    });
  }, [loadedImages, currentPage, getPageUrl]);

  // Cleanup PhotoSwipe on unmount
  useEffect(() => {
    return () => {
      if (pswpRef.current) {
        pswpRef.current.close();
      }
    };
  }, []);

  return {
    pswpRef,
    handleZoom,
  };
}
