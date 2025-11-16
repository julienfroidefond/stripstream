import { useCallback, useRef, useEffect } from "react";
import { useReadingDirection } from "./useReadingDirection";

interface UseTouchNavigationProps {
  onPreviousPage: () => void;
  onNextPage: () => void;
  pswpRef: React.MutableRefObject<any>;
}

export function useTouchNavigation({
  onPreviousPage,
  onNextPage,
  pswpRef,
}: UseTouchNavigationProps) {
  const { isRTL } = useReadingDirection();
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);

  // Helper pour vérifier si la page est zoomée (zoom natif du navigateur)
  const isZoomed = useCallback(() => {
    // Utiliser visualViewport.scale pour détecter le zoom natif
    // Si scale > 1, la page est zoomée
    if (window.visualViewport) {
      return window.visualViewport.scale > 1;
    }
    // Fallback pour les navigateurs qui ne supportent pas visualViewport
    // Comparer la taille de la fenêtre avec la taille réelle
    return window.innerWidth !== window.screen.width;
  }, []);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Ne pas gérer si Photoswipe est ouvert
    if (pswpRef.current) return;
    // Ne pas gérer si la page est zoomée (zoom natif)
    if (isZoomed()) return;
    
    // Détecter si c'est un pinch (2+ doigts)
    if (e.touches.length > 1) {
      isPinchingRef.current = true;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    
    // Un seul doigt - seulement si on n'était pas en train de pinch
    // On réinitialise isPinchingRef seulement ici, quand on commence un nouveau geste à 1 doigt
    if (e.touches.length === 1) {
      isPinchingRef.current = false;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  }, [pswpRef, isZoomed]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Détecter le pinch pendant le mouvement
    if (e.touches.length > 1) {
      isPinchingRef.current = true;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Si on était en mode pinch, ne JAMAIS traiter le swipe
    if (isPinchingRef.current) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      // Ne PAS réinitialiser isPinchingRef ici, on le fera au prochain touchstart
      return;
    }
    
    // Vérifier qu'on a bien des coordonnées de départ
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    // Ne pas gérer si Photoswipe est ouvert
    if (pswpRef.current) return;
    // Ne pas gérer si la page est zoomée (zoom natif)
    if (isZoomed()) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    // Si le déplacement vertical est plus important, on ignore (scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    // Seuil de 50px pour changer de page
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe vers la droite
        if (isRTL) {
          onNextPage();
        } else {
          onPreviousPage();
        }
      } else {
        // Swipe vers la gauche
        if (isRTL) {
          onPreviousPage();
        } else {
          onNextPage();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, [onNextPage, onPreviousPage, isRTL, pswpRef, isZoomed]);

  // Setup touch event listeners
  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
