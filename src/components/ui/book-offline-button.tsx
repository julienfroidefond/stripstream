"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";
import type { KomgaBook } from "@/types/komga";
import logger from "@/lib/logger";
import { unzip } from "fflate";

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
          progress: 0,
          timestamp: Date.now(),
          lastDownloadedPage: 0,
        });

        // Télécharger le fichier complet
        setDownloadProgress(5);
        const fileResponse = await fetch(`/api/komga/books/${book.id}/file`);
        if (!fileResponse.ok) throw new Error("Erreur lors du téléchargement du fichier");

        setDownloadProgress(20);
        const arrayBuffer = await fileResponse.arrayBuffer();

        setDownloadProgress(30);
        setBookStatus(book.id, {
          status: "downloading",
          progress: 30,
          timestamp: Date.now(),
        });

        // Décompresser le fichier
        const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
          unzip(new Uint8Array(arrayBuffer), (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        setDownloadProgress(50);

        // Filtrer et trier les images
        const imageExtensions = /\.(jpg|jpeg|png|webp|gif)$/i;
        const imageFiles = Object.entries(files)
          .filter(([name]) => imageExtensions.test(name))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

        if (imageFiles.length === 0) {
          throw new Error("Aucune image trouvée dans le fichier");
        }

        // Cache chaque image
        for (let i = 0; i < imageFiles.length; i++) {
          const [fileName, data] = imageFiles[i];
          const pageNumber = i + 1;

          // Déterminer le type MIME
          const ext = fileName.toLowerCase().split(".").pop();
          const mimeType =
            ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : ext === "gif"
                  ? "image/gif"
                  : "image/jpeg";

          const blob = new Blob([data], { type: mimeType });
          const fakeResponse = new Response(blob, {
            headers: {
              "Content-Type": mimeType,
              "Content-Length": String(data.length),
            },
          });

          await cache.put(`/api/komga/images/books/${book.id}/pages/${pageNumber}`, fakeResponse);

          // Mise à jour du statut
          const progress = 50 + ((i + 1) / imageFiles.length) * 50;
          setDownloadProgress(progress);
          setBookStatus(book.id, {
            status: "downloading",
            progress,
            timestamp: Date.now(),
            lastDownloadedPage: pageNumber,
          });

          // Vérifier si le statut a changé pendant le téléchargement
          const currentStatus = getBookStatus(book.id);
          if (currentStatus.status === "idle") {
            throw new Error("Téléchargement annulé");
          }
        }

        // Marquer comme disponible
        const pagesMetaResponse = new Response(JSON.stringify({ count: imageFiles.length }), {
          headers: { "Content-Type": "application/json" },
        });
        await cache.put(`/api/komga/images/books/${book.id}/pages`, pagesMetaResponse);

        setIsAvailableOffline(true);
        setBookStatus(book.id, { status: "available", progress: 100, timestamp: Date.now() });
        toast({
          title: "Livre téléchargé",
          description: `${imageFiles.length} pages disponibles hors ligne`,
        });
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
    [book.id, getBookStatus, setBookStatus, toast]
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
