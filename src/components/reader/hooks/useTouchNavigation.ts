import { useRef, useEffect } from "react";
import { actionForSide, isViewportZoomed, sideForSwipe } from "@/lib/reader/side-actions";

interface UseTouchNavigationProps {
  onPreviousPage: () => void;
  onNextPage: () => void;
  isRTL: boolean;
  /** Un dialogue ou la modale de fin couvre le lecteur : aucun swipe ne tourne la page. */
  disabled?: boolean;
}

export function useTouchNavigation({
  onPreviousPage,
  onNextPage,
  isRTL,
  disabled = false,
}: UseTouchNavigationProps) {
  // Garder les props/callbacks dans une ref pour que les handlers
  // restent stables et que les listeners ne soient attachés qu'une fois.
  const propsRef = useRef({ onPreviousPage, onNextPage, isRTL, disabled });
  useEffect(() => {
    propsRef.current = { onPreviousPage, onNextPage, isRTL, disabled };
  }, [onPreviousPage, onNextPage, isRTL, disabled]);

  useEffect(() => {
    let touchStartX: number | null = null;
    let touchStartY: number | null = null;
    let isPinching = false;

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
      if (isViewportZoomed(window.visualViewport?.scale)) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      touchStartX = null;
      touchStartY = null;

      const side = sideForSwipe(deltaX, deltaY);
      if (!side) return;

      const { onPreviousPage, onNextPage, isRTL, disabled } = propsRef.current;
      if (disabled) return;
      if (actionForSide(side, isRTL ? "rtl" : "ltr") === "previous") onPreviousPage();
      else onNextPage();
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
