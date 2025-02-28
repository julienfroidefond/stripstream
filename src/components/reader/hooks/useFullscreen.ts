import { useState, useEffect } from "react";

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
        document.exitFullscreen().catch(console.error);
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
      console.error("Erreur lors du changement de mode plein écran:", error);
    }
  };

  return {
    isFullscreen,
    toggleFullscreen,
  };
};
