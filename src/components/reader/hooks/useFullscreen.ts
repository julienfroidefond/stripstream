import { useEffect, useSyncExternalStore } from "react";
import logger from "@/lib/logger";

// iOS Safari ne supporte pas l'API Fullscreen sur des éléments arbitraires.
// document.fullscreenEnabled est false dans ce cas.
function detectFullscreenAvailable(): boolean {
  if (typeof document === "undefined") return false;
  if (document.fullscreenEnabled) return true;
  // Préfixe webkit pour anciens navigateurs (rare aujourd'hui)
  const doc = document as Document & { webkitFullscreenEnabled?: boolean };
  return doc.webkitFullscreenEnabled === true;
}

const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const getFullscreenSnapshot = () =>
  typeof document !== "undefined" && !!document.fullscreenElement;
const getFullscreenServerSnapshot = () => false;

// La disponibilité du fullscreen ne change pas au runtime : pas de subscribe nécessaire.
const subscribeNoop = () => {
  return () => undefined;
};
const getAvailableServerSnapshot = () => false;

export const useFullscreen = () => {
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getFullscreenServerSnapshot
  );
  const isFullscreenAvailable = useSyncExternalStore(
    subscribeNoop,
    detectFullscreenAvailable,
    getAvailableServerSnapshot
  );

  // Sortie de plein écran au démontage si encore actif
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document
          .exitFullscreen()
          .catch((err) => logger.error({ err }, "Erreur lors de la sortie du mode plein écran"));
      }
    };
  }, []);

  const toggleFullscreen = async (element: HTMLElement | null) => {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else if (element) {
        await element.requestFullscreen();
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du changement de mode plein écran:");
    }
  };

  return {
    isFullscreen,
    isFullscreenAvailable,
    toggleFullscreen,
  };
};
