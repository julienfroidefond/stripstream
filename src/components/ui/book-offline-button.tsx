"use client";

import { useState, useEffect } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";
import { KomgaBook } from "@/types/komga";

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

  const getStorageKey = (bookId: string) => `book-status-${bookId}`;

  const getBookStatus = (bookId: string): BookDownloadStatus => {
    try {
      const status = localStorage.getItem(getStorageKey(bookId));
      return status ? JSON.parse(status) : { status: "idle", progress: 0, timestamp: 0 };
    } catch {
      return { status: "idle", progress: 0, timestamp: 0 };
    }
  };

  const setBookStatus = (bookId: string, status: BookDownloadStatus) => {
    localStorage.setItem(getStorageKey(bookId), JSON.stringify(status));
  };

  const downloadBook = async (startFromPage: number = 1) => {
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
        const pagesResponse = await fetch(`/api/komga/books/${book.id}/pages`);
        await cache.put(`/api/komga/books/${book.id}/pages`, pagesResponse.clone());
      }

      // Cache chaque page
      let failedPages = 0;
      for (let i = startFromPage; i <= book.media.pagesCount; i++) {
        try {
          const pageResponse = await fetch(`/api/komga/books/${book.id}/pages/${i}`);
          if (!pageResponse.ok) {
            failedPages++;
            continue;
          }
          await cache.put(`/api/komga/books/${book.id}/pages/${i}`, pageResponse.clone());
        } catch (error) {
          console.error(`Erreur lors du téléchargement de la page ${i}:`, error);
          failedPages++;
        }
        const progress = (i / book.media.pagesCount) * 100;
        setDownloadProgress(progress);
        setBookStatus(book.id, {
          status: "downloading",
          progress,
          timestamp: Date.now(),
          lastDownloadedPage: i,
        });
      }

      if (failedPages > 0) {
        // Si des pages ont échoué, on supprime tout le cache pour ce livre
        await cache.delete(`/api/komga/books/${book.id}/pages`);
        for (let i = 1; i <= book.media.pagesCount; i++) {
          await cache.delete(`/api/komga/books/${book.id}/pages/${i}`);
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
      console.error("Erreur lors du téléchargement:", error);
      setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du téléchargement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  };

  // Vérifie si le livre est déjà disponible hors ligne
  useEffect(() => {
    const checkStatus = async () => {
      const storedStatus = getBookStatus(book.id);

      // Si le livre est marqué comme en cours de téléchargement
      if (storedStatus.status === "downloading") {
        // Si le téléchargement a commencé il y a plus de 5 minutes, on considère qu'il a échoué
        if (Date.now() - storedStatus.timestamp > 5 * 60 * 1000) {
          setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
          setIsLoading(false);
          setDownloadProgress(0);
        } else {
          // On reprend le téléchargement là où il s'était arrêté
          setIsLoading(true);
          setDownloadProgress(storedStatus.progress);
          const startFromPage = (storedStatus.lastDownloadedPage || 0) + 1;
          downloadBook(startFromPage);
        }
      }

      await checkOfflineAvailability();
    };

    checkStatus();
  }, [book.id]);

  const checkOfflineAvailability = async () => {
    if (!("caches" in window)) return;

    try {
      const cache = await caches.open("stripstream-books");
      // On vérifie que toutes les pages sont dans le cache
      const bookPages = await cache.match(`/api/komga/books/${book.id}/pages`);
      if (!bookPages) {
        setIsAvailableOffline(false);
        setBookStatus(book.id, { status: "idle", progress: 0, timestamp: Date.now() });
        return;
      }

      // Vérifie que toutes les pages sont dans le cache
      let allPagesAvailable = true;
      for (let i = 1; i <= book.media.pagesCount; i++) {
        const page = await cache.match(`/api/komga/books/${book.id}/pages/${i}`);
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
      console.error("Erreur lors de la vérification du cache:", error);
      setBookStatus(book.id, { status: "error", progress: 0, timestamp: Date.now() });
    }
  };

  const handleToggleOffline = async () => {
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
        await cache.delete(`/api/komga/books/${book.id}/pages`);
        for (let i = 1; i <= book.media.pagesCount; i++) {
          await cache.delete(`/api/komga/books/${book.id}/pages/${i}`);
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
      console.error("Erreur lors de la gestion du cache:", error);
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
