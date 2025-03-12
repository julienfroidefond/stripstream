import { useState, useEffect, useRef } from "react";

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

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

  const setFullscreenElement = (element: HTMLElement | null) => {
    elementRef.current = element;
  };

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else if (elementRef.current) {
        await elementRef.current.requestFullscreen();
      } else if (document.documentElement) {
        // Si aucun élément n'est défini, utiliser l'élément racine du document
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Erreur lors du changement de mode plein écran:", error);
    }
  };

  return {
    isFullscreen,
    toggleFullscreen,
    setFullscreenElement,
  };
};
