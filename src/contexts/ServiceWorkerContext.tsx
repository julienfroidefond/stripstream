"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerEnabledInDev,
  setServiceWorkerEnabledInDev,
} from "@/lib/registerSW";
import logger from "@/lib/logger";

interface CacheStats {
  static: { size: number; entries: number };
  images: { size: number; entries: number };
  books: { size: number; entries: number };
  total: number;
}

interface CacheEntry {
  url: string;
  size: number;
}

interface CacheUpdate {
  url: string;
  timestamp: number;
}

type CacheType = "all" | "static" | "images" | "books";

interface ServiceWorkerContextValue {
  isSupported: boolean;
  isReady: boolean;
  isDevModeEnabled: boolean;
  version: string | null;
  hasNewVersion: boolean;
  cacheUpdates: CacheUpdate[];
  clearCacheUpdate: (url: string) => void;
  clearAllCacheUpdates: () => void;
  getCacheStats: () => Promise<CacheStats | null>;
  getCacheEntries: (cacheType: CacheType) => Promise<CacheEntry[] | null>;
  clearCache: (cacheType?: CacheType) => Promise<boolean>;
  skipWaiting: () => void;
  reloadForUpdate: () => void;
  reinstallServiceWorker: () => Promise<boolean>;
  setDevModeEnabled: (enabled: boolean) => Promise<boolean>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue | null>(null);

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(() => isServiceWorkerEnabledInDev());
  const [version, setVersion] = useState<string | null>(null);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [cacheUpdates, setCacheUpdates] = useState<CacheUpdate[]>([]);
  const pendingRequests = useRef<Map<string, (value: unknown) => void>>(new Map());
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  // Handle messages from service worker
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      // Ignore messages without proper data structure
      if (!event.data || typeof event.data !== "object") return;

      // Only handle messages from our service worker (check for known message types)
      const knownTypes = [
        "SW_ACTIVATED",
        "SW_VERSION",
        "CACHE_UPDATED",
        "CACHE_STATS",
        "CACHE_STATS_ERROR",
        "CACHE_CLEARED",
        "CACHE_CLEAR_ERROR",
        "CACHE_ENTRIES",
        "CACHE_ENTRIES_ERROR",
      ];

      const type = event.data.type;
      if (typeof type !== "string" || !knownTypes.includes(type)) return;

      const payload = event.data.payload;

      switch (type) {
        case "SW_ACTIVATED":
          setIsReady(true);
          setVersion(payload?.version || null);
          break;

        case "SW_VERSION":
          setVersion(payload?.version || null);
          break;

        case "CACHE_UPDATED": {
          const url = typeof payload?.url === "string" ? payload.url : null;
          const timestamp = typeof payload?.timestamp === "number" ? payload.timestamp : Date.now();
          if (url) {
            setCacheUpdates((prev) => {
              // Avoid duplicates for the same URL within 1 second
              const existing = prev.find((u) => u.url === url && Date.now() - u.timestamp < 1000);
              if (existing) return prev;
              return [...prev, { url, timestamp }];
            });
          }
          break;
        }

        case "CACHE_STATS":
          const statsResolver = pendingRequests.current.get("CACHE_STATS");
          if (statsResolver) {
            const normalizedPayload = {
              ...payload,
              visitablePages:
                typeof payload?.visitablePages === "number" ? payload.visitablePages : 0,
            };
            statsResolver(normalizedPayload);
            pendingRequests.current.delete("CACHE_STATS");
          }
          break;

        case "CACHE_STATS_ERROR":
          const statsErrorResolver = pendingRequests.current.get("CACHE_STATS");
          if (statsErrorResolver) {
            statsErrorResolver(null);
            pendingRequests.current.delete("CACHE_STATS");
          }
          break;

        case "CACHE_CLEARED":
          const clearResolver = pendingRequests.current.get("CACHE_CLEARED");
          if (clearResolver) {
            clearResolver(true);
            pendingRequests.current.delete("CACHE_CLEARED");
          }
          break;

        case "CACHE_CLEAR_ERROR":
          const clearErrorResolver = pendingRequests.current.get("CACHE_CLEARED");
          if (clearErrorResolver) {
            clearErrorResolver(false);
            pendingRequests.current.delete("CACHE_CLEARED");
          }
          break;

        case "CACHE_ENTRIES": {
          const entriesResolver = pendingRequests.current.get("CACHE_ENTRIES");
          if (entriesResolver) {
            entriesResolver(payload?.entries || null);
            pendingRequests.current.delete("CACHE_ENTRIES");
          }
          break;
        }

        case "CACHE_ENTRIES_ERROR": {
          const entriesErrorResolver = pendingRequests.current.get("CACHE_ENTRIES");
          if (entriesErrorResolver) {
            entriesErrorResolver(null);
            pendingRequests.current.delete("CACHE_ENTRIES");
          }
          break;
        }

        default:
          // Ignore unknown message types
          break;
      }
    } catch (error) {
      // Silently ignore message handling errors to prevent app crashes
      // This can happen with malformed messages or during SW reinstall
      if (process.env.NODE_ENV === "development") {
        console.warn("[SW Context] Error handling message:", error, event.data);
      }
    }
  }, []);

  // Initialize service worker communication
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setIsSupported(false);
      return;
    }

    if (!isServiceWorkerEnabledInDev()) {
      setIsDevModeEnabled(false);
      // Browser still supports SW, it is only disabled by preference
      setIsSupported(true);
      setIsReady(false);
      setVersion(null);

      unregisterServiceWorker().catch(() => {
        // Ignore cleanup failures in development
      });

      return;
    }

    setIsDevModeEnabled(true);

    setIsSupported(true);

    // Register service worker
    registerServiceWorker({
      onSuccess: (registration) => {
        logger.info({ scope: registration.scope }, "Service worker registered");
        setIsReady(true);
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" });
        }
      },
      onUpdate: (registration) => {
        logger.info("New service worker version available");
        setHasNewVersion(true);
        waitingWorkerRef.current = registration.waiting;
      },
      onError: (error) => {
        logger.error({ err: error }, "Service worker registration failed");
      },
    });

    // Listen for messages
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Check if already controlled
    if (navigator.serviceWorker.controller) {
      setIsReady(true);
      // Request version
      navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" });
    }

    // Listen for controller changes
    const handleControllerChange = () => {
      setIsReady(true);
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" });
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [handleMessage]);

  const clearCacheUpdate = useCallback((url: string) => {
    setCacheUpdates((prev) => prev.filter((u) => u.url !== url));
  }, []);

  const clearAllCacheUpdates = useCallback(() => {
    setCacheUpdates([]);
  }, []);

  const getCacheStats = useCallback(async (): Promise<CacheStats | null> => {
    if (!navigator.serviceWorker.controller) return null;

    return new Promise((resolve) => {
      pendingRequests.current.set("CACHE_STATS", resolve as (value: unknown) => void);
      navigator.serviceWorker.controller!.postMessage({ type: "GET_CACHE_STATS" });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingRequests.current.has("CACHE_STATS")) {
          pendingRequests.current.delete("CACHE_STATS");
          resolve(null);
        }
      }, 5000);
    });
  }, []);

  const getCacheEntries = useCallback(
    async (cacheType: CacheType): Promise<CacheEntry[] | null> => {
      if (!navigator.serviceWorker.controller) return null;

      return new Promise((resolve) => {
        pendingRequests.current.set("CACHE_ENTRIES", resolve as (value: unknown) => void);
        navigator.serviceWorker.controller!.postMessage({
          type: "GET_CACHE_ENTRIES",
          payload: { cacheType },
        });

        // Timeout after 10 seconds (can be slow for large caches)
        setTimeout(() => {
          if (pendingRequests.current.has("CACHE_ENTRIES")) {
            pendingRequests.current.delete("CACHE_ENTRIES");
            resolve(null);
          }
        }, 10000);
      });
    },
    []
  );

  const clearCache = useCallback(async (cacheType: CacheType = "all"): Promise<boolean> => {
    if (!navigator.serviceWorker.controller) return false;

    return new Promise((resolve) => {
      pendingRequests.current.set("CACHE_CLEARED", resolve as (value: unknown) => void);
      navigator.serviceWorker.controller!.postMessage({
        type: "CLEAR_CACHE",
        payload: { cacheType },
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingRequests.current.has("CACHE_CLEARED")) {
          pendingRequests.current.delete("CACHE_CLEARED");
          resolve(false);
        }
      }, 10000);
    });
  }, []);

  const skipWaiting = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  const reloadForUpdate = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      setHasNewVersion(false);
      // Reload will happen automatically when new SW takes control
      window.location.reload();
    }
  }, []);

  const reinstallServiceWorker = useCallback(async (): Promise<boolean> => {
    try {
      // Unregister all service workers
      await unregisterServiceWorker();
      setIsReady(false);
      setVersion(null);

      // Re-register
      const registration = await registerServiceWorker({
        onSuccess: () => {
          setIsReady(true);
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" });
          }
        },
        onError: (error) => {
          logger.error({ err: error }, "Service worker re-registration failed");
        },
      });

      if (registration) {
        // Force update check
        await registration.update();
        // Reload page to ensure new SW takes control
        window.location.reload();
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ err: error }, "Failed to reinstall service worker");
      return false;
    }
  }, []);

  const setDevModeEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    try {
      setServiceWorkerEnabledInDev(enabled);
      setIsDevModeEnabled(enabled);

      if (!enabled) {
        await unregisterServiceWorker();
        setIsSupported("serviceWorker" in navigator);
        setIsReady(false);
        setVersion(null);
        setHasNewVersion(false);
      }

      window.location.reload();
      return true;
    } catch (error) {
      logger.error({ err: error }, "Failed to toggle service worker");
      return false;
    }
  }, []);

  return (
    <ServiceWorkerContext.Provider
      value={{
        isSupported,
        isReady,
        isDevModeEnabled,
        version,
        hasNewVersion,
        cacheUpdates,
        clearCacheUpdate,
        clearAllCacheUpdates,
        getCacheStats,
        getCacheEntries,
        clearCache,
        skipWaiting,
        reloadForUpdate,
        reinstallServiceWorker,
        setDevModeEnabled,
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorker() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error("useServiceWorker must be used within a ServiceWorkerProvider");
  }
  return context;
}
