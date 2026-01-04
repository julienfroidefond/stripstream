"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";
import type { KomgaBook } from "@/types/komga";
import logger from "@/lib/logger";

interface BookOfflineButtonProps {
  book: KomgaBook;
  className?: string;
}

// Statuts possibles pour un livre
type BookStatus = "idle" | "downloading" | "available" | "error";

interface BookDownloadStatus {
  status: BookStatus;
  progress: number;
  timestamp: number;
  lastDownloadedPage?: number;
}

export function BookOfflineButton({ book, className }: BookOfflineButtonProps) {
  const [isAvailableOffline, setIsAvailableOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  const getStorageKey = useCallback((bookId: string) => `book-status-${bookId}`, []);

  const getBookStatus = useCallback(
    (bookId: string): BookDownloadStatus => {
      try {
        const status = localStorage.getItem(getStorageKey(bookId));
        return status ? JSON.parse(status) : { status: "idle", progress: 0, timestamp: 0 };
      } catch {
        return { status: "idle", progress: 0, timestamp: 0 };
      }
    },
    [getStorageKey]
  );

  const setBookStatus = useCallback(
    (bookId: string, status: BookDownloadStatus) => {
      localStorage.setItem(getStorageKey(bookId), JSON.stringify(status));
    },
    [getStorageKey]
  );

  const downloadBook = useCallback(
    async (startFromPage: number = 1) => {
      try {
        const cache = await caches.open("stripstream-books");

        // Marque le début du téléchargement
        setBookStatus(book.id, {
          status: "downloading",
          progress: ((startFromPage - 1) / book.media.pagesCount) * 100,
          timestamp: Date.now(),
          lastDownloadedPage: startFromPage - 1,
        });

        // Ajoute le livre au cache si on commence depuis le début
        if (startFromPage === 1) {
          const pagesResponse = await fetch(`/api/komga/images/books/${book.id}/pages/1`);
          if (!pagesResponse.ok) throw new Error("Erreur lors de la récupération des pages");
          await cache.put(`/api/komga/images/books/${book.id}/pages`, pagesResponse.clone());
        }

        // Cache chaque page avec retry
        let failedPages = 0;
        for (let i = startFromPage; i <= book.media.pagesCount; i++) {
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              const pageResponse = await fetch(`/api/komga/images/books/${book.id}/pages/${i}`);
              if (!pageResponse.ok) {
                retryCount++;
                if (retryCount === maxRetries) {
                  failedPages++;
                  logger.error(
                    `Échec du téléchargement de la page ${i} après ${maxRetries} tentatives`
                  );
                }
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Attendre 1s avant de réessayer
                continue;
              }
              await cache.put(
                `/api/komga/images/books/${book.id}/pages/${i}`,
                pageResponse.clone()
              );
              break; // Sortir de la boucle si réussi
            } catch (error) {
              retryCount++;
              if (retryCount === maxRetries) {
                failedPages++;
                logger.error({ err: error }, `Erreur lors du téléchargement de la page ${i}:`);
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // Mise à jour du statut
          const progress = (i / book.media.pagesCount) * 100;
          setDownloadProgress(progress);
          setBookStatus(book.id, {
            status: "downloading",
            progress,
            timestamp: Date.now(),
            lastDownloadedPage: i,
          });

          // Vérifier si le statut a changé pendant le téléchargement
          const currentStatus = getBookStatus(book.id);
          if (currentStatus.status === "idle") {
            // Le téléchargement a été annulé
            throw new Error("Téléchargement annulé");
          }
        }

        if (failedPages > 0) {
          // Si des pages ont échoué, on supprime tout le cache pour ce livre
          await cache.delete(`/api/komga/images/books/${book.id}/pages`);
          for (let i = 1; i <= book.media.pagesCount; i++) {
            await cache.delete(`/api/komga/images/books/${book.id}/pages/${i}`);
          }
          setIsAvailableOffline(false);
          setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
          toast({
            title: "Erreur",
            description: `${failedPages} page(s) n'ont pas pu être téléchargées. Le livre ne sera pas disponible hors ligne.`,
            variant: "destructive",
          });
        } else {
          setIsAvailableOffline(true);
          setBookStatus(book.id, { status: "available", progress: 100, timestamp: Date.now() });
          toast({
            title: "Livre téléchargé",
            description: "Le livre est maintenant disponible hors ligne",
          });
        }
      } catch (error) {
        logger.error({ err: error }, "Erreur lors du téléchargement:");
        // Ne pas changer le statut si le téléchargement a été volontairement annulé
        if ((error as Error)?.message !== "Téléchargement annulé") {
          setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
          toast({
            title: "Erreur",
            description: "Une erreur est survenue lors du téléchargement",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setDownloadProgress(0);
      }
    },
    [book.id, book.media.pagesCount, getBookStatus, setBookStatus, toast]
  );

  const checkOfflineAvailability = useCallback(async () => {
    if (!("caches" in window)) return;

    try {
      const cache = await caches.open("stripstream-books");
      // On vérifie que toutes les pages sont dans le cache
      const bookPages = await cache.match(`/api/komga/images/books/${book.id}/pages`);
      if (!bookPages) {
        setIsAvailableOffline(false);
        setBookStatus(book.id, { status: "idle", progress: 0, timestamp: Date.now() });
        return;
      }

      // Vérifie que toutes les pages sont dans le cache
      let allPagesAvailable = true;
      for (let i = 1; i <= book.media.pagesCount; i++) {
        const page = await cache.match(`/api/komga/images/books/${book.id}/pages/${i}`);
        if (!page) {
          allPagesAvailable = false;
          break;
        }
      }

      setIsAvailableOffline(allPagesAvailable);
      setBookStatus(book.id, {
        status: allPagesAvailable ? "available" : "idle",
        progress: allPagesAvailable ? 100 : 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la vérification du cache:");
      setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
    }
  }, [book.id, book.media.pagesCount, setBookStatus]);

  useEffect(() => {
    const checkStatus = async () => {
      const storedStatus = getBookStatus(book.id);

      if (storedStatus.status === "downloading") {
        if (Date.now() - storedStatus.timestamp > 5 * 60 * 1000) {
          setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
          setIsLoading(false);
          setDownloadProgress(0);
        } else {
          setIsLoading(true);
          setDownloadProgress(storedStatus.progress);
          const startFromPage = (storedStatus.lastDownloadedPage || 0) + 1;
          downloadBook(startFromPage);
        }
      }

      await checkOfflineAvailability();
    };

    checkStatus();
  }, [book.id, checkOfflineAvailability, downloadBook, getBookStatus, setBookStatus]);

  const handleToggleOffline = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent

    if (!("caches" in window)) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas le stockage hors ligne",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDownloadProgress(0);

    try {
      const cache = await caches.open("stripstream-books");

      if (isAvailableOffline) {
        setBookStatus(book.id, { status: "idle", progress: 0, timestamp: Date.now() });
        // Supprime le livre du cache
        await cache.delete(`/api/komga/images/books/${book.id}/pages`);
        for (let i = 1; i <= book.media.pagesCount; i++) {
          await cache.delete(`/api/komga/images/books/${book.id}/pages/${i}`);
          const progress = (i / book.media.pagesCount) * 100;
          setDownloadProgress(progress);
        }
        setIsAvailableOffline(false);
        toast({
          title: "Livre supprimé",
          description: "Le livre n'est plus disponible hors ligne",
        });
      } else {
        await downloadBook();
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la gestion du cache:");
      setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la gestion du stockage hors ligne",
        variant: "destructive",
      });
      setIsAvailableOffline(false);
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  };

  const buttonTitle = isLoading
    ? `Téléchargement en cours (${Math.round(downloadProgress)}%)`
    : isAvailableOffline
      ? "Supprimer hors ligne"
      : "Disponible hors ligne";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleOffline}
      className={`h-8 w-8 p-0 rounded-br-lg rounded-tl-lg ${className}`}
      disabled={isLoading}
      title={buttonTitle}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAvailableOffline ? (
        <Check className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}
