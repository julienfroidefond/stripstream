"use client";

import { useState, useEffect, useCallback } from "react";
import { useNetworkStatus } from "./useNetworkStatus";
import logger from "@/lib/logger";

type BookStatus = "idle" | "downloading" | "available" | "error";

interface BookDownloadStatus {
  status: BookStatus;
  progress: number;
  timestamp: number;
  lastDownloadedPage?: number;
}

/**
 * Hook pour vérifier si un livre est disponible hors ligne
 */
export function useBookOfflineStatus(bookId: string) {
  const [isAvailableOffline, setIsAvailableOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const isOnline = useNetworkStatus();

  const getStorageKey = useCallback((id: string) => `book-status-${id}`, []);

  const checkOfflineAvailability = useCallback(async () => {
    if (typeof window === "undefined" || !("caches" in window)) {
      setIsAvailableOffline(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      // Vérifier le localStorage d'abord (plus rapide)
      const statusStr = localStorage.getItem(getStorageKey(bookId));
      if (statusStr) {
        const status: BookDownloadStatus = JSON.parse(statusStr);
        if (status.status === "available") {
          setIsAvailableOffline(true);
          setIsChecking(false);
          return;
        }
      }

      // Sinon vérifier le cache
      const cache = await caches.open("stripstream-books");
      const bookPages = await cache.match(`/api/komga/images/books/${bookId}/pages`);
      setIsAvailableOffline(!!bookPages);
    } catch (error) {
      logger.error({ err: error, bookId }, "Erreur lors de la vérification du cache");
      setIsAvailableOffline(false);
    } finally {
      setIsChecking(false);
    }
  }, [bookId, getStorageKey]);

  useEffect(() => {
    checkOfflineAvailability();

    // Écouter les changements de localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getStorageKey(bookId)) {
        checkOfflineAvailability();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Rafraîchir périodiquement (pour les changements dans le même onglet)
    const interval = setInterval(checkOfflineAvailability, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [bookId, checkOfflineAvailability, getStorageKey]);

  return {
    isAvailableOffline,
    isChecking,
    isOnline,
    // Le livre est "accessible" s'il est disponible hors ligne OU si on est en ligne
    isAccessible: isAvailableOffline || isOnline,
  };
}
