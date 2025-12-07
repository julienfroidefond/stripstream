import { useImageCache } from "@/contexts/ImageCacheContext";
import { useMemo } from "react";

/**
 * Hook pour obtenir une URL d'image avec cache busting
 * Ajoute automatiquement ?v={cacheVersion} à l'URL
 */
export function useImageUrl(baseUrl: string): string {
  const { getImageUrl } = useImageCache();

  return useMemo(() => {
    return getImageUrl(baseUrl);
  }, [baseUrl, getImageUrl]);
}
