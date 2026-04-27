import { useState, useEffect } from "react";
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

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenAvailable, setIsFullscreenAvailable] = useState(false);

  useEffect(() => {
    setIsFullscreenAvailable(detectFullscreenAvailable());

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
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
