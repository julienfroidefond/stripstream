import { useRef, useEffect } from "react";

interface UseTouchNavigationProps {
  onPreviousPage: () => void;
  onNextPage: () => void;
  isRTL: boolean;
}

export function useTouchNavigation({
  onPreviousPage,
  onNextPage,
  isRTL,
}: UseTouchNavigationProps) {
  // Garder les props/callbacks dans une ref pour que les handlers
  // restent stables et que les listeners ne soient attachés qu'une fois.
  const propsRef = useRef({ onPreviousPage, onNextPage, isRTL });
  useEffect(() => {
    propsRef.current = { onPreviousPage, onNextPage, isRTL };
  }, [onPreviousPage, onNextPage, isRTL]);

  useEffect(() => {
    let touchStartX: number | null = null;
    let touchStartY: number | null = null;
    let isPinching = false;

    // Seuil à 1.15 pour tolérer les imprécisions après un depinch
    const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.15;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        isPinching = true;
        touchStartX = null;
        touchStartY = null;
        return;
      }
      if (e.touches.length === 1) {
        isPinching = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        isPinching = true;
        touchStartX = null;
        touchStartY = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching) {
        touchStartX = null;
        touchStartY = null;
        return;
      }
      if (touchStartX === null || touchStartY === null) return;
      if (isZoomed()) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      touchStartX = null;
      touchStartY = null;

      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      if (Math.abs(deltaX) <= 50) return;

      const { onPreviousPage, onNextPage, isRTL } = propsRef.current;
      if (deltaX > 0) {
        isRTL ? onNextPage() : onPreviousPage();
      } else {
        isRTL ? onPreviousPage() : onNextPage();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);
}
