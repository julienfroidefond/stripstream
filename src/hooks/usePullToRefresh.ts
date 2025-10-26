"use client";

import { useEffect, useRef, useState } from "react";
import logger from "@/lib/logger";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
  isHiding: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false,
    isHiding: false,
  });

  const startY = useRef(0);
  const currentY = useRef(0);
  const startScrollTop = useRef(0);
  const isValidPull = useRef(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      
      // Ignorer les touches sur les éléments interactifs (boutons, liens, menu, etc.)
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('nav') ||
        target.closest('header') ||
        target.closest('[data-no-pull-refresh]')
      ) {
        isValidPull.current = false;
        return;
      }
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      startScrollTop.current = scrollTop;
      
      // Ne démarrer que si on est vraiment en haut de la page
      if (scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        currentY.current = e.touches[0].clientY;
        isValidPull.current = true;
      } else {
        isValidPull.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidPull.current || isRefreshingRef.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;
      
      // Vérifier qu'on est toujours en haut ET qu'on tire vers le bas
      if (scrollTop === 0 && deltaY > 0) {
        const pullDistance = Math.min(deltaY * resistance, threshold * 1.5);
        const canRefresh = pullDistance >= threshold;
        
        setState(prev => ({
          ...prev,
          isPulling: true,
          pullDistance,
          canRefresh,
        }));

        // Empêcher le scroll par défaut quand on tire vers le bas
        if (pullDistance > 10) {
          e.preventDefault();
        }
      } else if (scrollTop > 0 || deltaY < 0) {
        // Si on scrolle ou qu'on tire vers le haut, annuler
        isValidPull.current = false;
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          canRefresh: false,
        }));
      }
    };

    const handleTouchEnd = async () => {
      if (!isValidPull.current || isRefreshingRef.current) {
        isValidPull.current = false;
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          canRefresh: false,
        }));
        return;
      }

      const shouldRefresh = state.canRefresh;
      
      setState(prev => ({
        ...prev,
        isPulling: false,
      }));

      if (shouldRefresh) {
        isRefreshingRef.current = true;
        setState(prev => ({
          ...prev,
          isRefreshing: true,
          pullDistance: 0,
        }));

        try {
          await onRefresh();
        } catch (error) {
          logger.error({ err: error }, "Pull to refresh error");
        } finally {
          isRefreshingRef.current = false;
          // Activer l'animation de disparition
          setState(prev => ({
            ...prev,
            isHiding: true,
          }));
          
          // Attendre la fin de l'animation avant de masquer complètement
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              isRefreshing: false,
              isHiding: false,
            }));
          }, 300); // Durée de l'animation en ms
        }
      } else {
        // Animation de retour
        setState(prev => ({
          ...prev,
          pullDistance: 0,
          canRefresh: false,
        }));
      }
      
      isValidPull.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [state.isPulling, state.canRefresh, onRefresh, threshold, resistance, enabled]);

  return {
    ...state,
    progress: Math.min(state.pullDistance / threshold, 1),
  };
}
