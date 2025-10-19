"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface ImageCacheContextType {
  cacheVersion: string;
  flushImageCache: () => void;
  getImageUrl: (baseUrl: string) => string;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

export function ImageCacheProvider({ children }: { children: React.ReactNode }) {
  const [cacheVersion, setCacheVersion] = useState<string>("");

  // Initialiser la version depuis localStorage au montage
  useEffect(() => {
    const storedVersion = localStorage.getItem("imageCacheVersion");
    if (storedVersion) {
      setCacheVersion(storedVersion);
    } else {
      const newVersion = Date.now().toString();
      setCacheVersion(newVersion);
      localStorage.setItem("imageCacheVersion", newVersion);
    }
  }, []);

  const flushImageCache = useCallback(() => {
    const newVersion = Date.now().toString();
    setCacheVersion(newVersion);
    localStorage.setItem("imageCacheVersion", newVersion);
    // eslint-disable-next-line no-console
    console.log("🗑️  Image cache flushed - new version:", newVersion);
  }, []);

  const getImageUrl = useCallback(
    (baseUrl: string) => {
      if (!cacheVersion) return baseUrl;
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}v=${cacheVersion}`;
    },
    [cacheVersion]
  );

  return (
    <ImageCacheContext.Provider value={{ cacheVersion, flushImageCache, getImageUrl }}>
      {children}
    </ImageCacheContext.Provider>
  );
}

export function useImageCache() {
  const context = useContext(ImageCacheContext);
  if (context === undefined) {
    throw new Error("useImageCache must be used within an ImageCacheProvider");
  }
  return context;
}

