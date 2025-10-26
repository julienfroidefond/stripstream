import { useState, useEffect } from "react";
import logger from "@/lib/logger";

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => logger.error({ err }, "Erreur lors de la sortie du mode plein écran"));
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
    toggleFullscreen,
  };
};
